type ChatRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** 전역 일일 한도 초과 여부. */
  scope?: "client" | "daily";
};

type ChatRateLimiter = (request: Request) => ChatRateLimitResult | Promise<ChatRateLimitResult>;

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  maxEntries: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type UpstashRateLimitOptions = Pick<RateLimitOptions, "limit" | "windowMs"> & {
  url: string;
  token: string;
  timeoutMs: number;
  fetcher: typeof fetch;
  fallback: ChatRateLimiter;
  /** 모든 IP를 합산한 일일 요청 상한. */
  dailyLimit: number;
  now: () => number;
};

type ChatRateLimitEnvironment = {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  KV_REST_API_URL?: string;
  KV_REST_API_TOKEN?: string;
};

class ChatRateLimitConfigurationError extends Error {
  constructor() {
    super("Shared chat rate limiter configuration is invalid");
    this.name = "ChatRateLimitConfigurationError";
  }
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  limit: 10,
  windowMs: 60_000,
  maxEntries: 500,
};

/**
 * 정상 트래픽은 허용하면서 제공자 예산에 닿기 전에 요청을 차단할 기본 일일 상한.
 */
const DEFAULT_DAILY_LIMIT = 1_000;

const configuredDailyLimit = (): number => {
  const parsed = Number(process.env.CHAT_DAILY_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_LIMIT;
};

/**
 * IP 윈도우와 전역 일일 카운터를 하나의 EVAL에서 갱신한다.
 * IP 제한에 걸린 요청은 LLM 을 호출하지 않으므로 일일 카운터도 올리지 않는다(daily = -1 반환).
 */
const UPSTASH_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if count > tonumber(ARGV[3]) then
  return { count, ttl, -1 }
end
local daily = redis.call("INCR", KEYS[2])
if daily == 1 then
  redis.call("PEXPIRE", KEYS[2], ARGV[2])
end
return { count, ttl, daily }
`;

/**
 * 모든 인스턴스가 공유하는 UTC 날짜 키.
 *
 * @param {number} now
 * @returns {string}
 */
const dailyBucket = (now: number): string => new Date(now).toISOString().slice(0, 10);

/**
 * Retry-After에 사용할 다음 UTC 자정까지의 초.
 *
 * @param {number} now
 * @returns {number}
 */
const secondsUntilNextUtcDay = (now: number): number => {
  const date = new Date(now);
  const nextMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1, Math.ceil((nextMidnight - now) / 1_000));
};

/**
 * Vercel 이 직접 채우는 `x-vercel-forwarded-for` 를 최우선으로 본다.
 * `x-forwarded-for` 는 클라이언트가 임의로 덧붙일 수 있어, 그 첫 항목을 키로 쓰면
 * 임의 헤더로 새 제한 버킷을 만들지 못하게 한다.
 *
 * @param {Request} request
 * @returns {string}
 */
const clientKey = (request: Request): string => {
  const address =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return address.slice(0, 128);
};

const createChatRateLimiter = (options: Partial<RateLimitOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const entries = new Map<string, RateLimitEntry>();

  return (request: Request, now = Date.now()): ChatRateLimitResult => {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }

    const key = clientKey(request);
    const current = entries.get(key);
    if (!current) {
      if (entries.size >= config.maxEntries) {
        const oldestKey = entries.keys().next().value as string | undefined;
        if (oldestKey) entries.delete(oldestKey);
      }
      entries.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= config.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
      };
    }

    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  };
};

const hashClientKey = async (request: Request): Promise<string> => {
  const bytes = new TextEncoder().encode(clientKey(request));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createUpstashChatRateLimiter = (options: Partial<UpstashRateLimitOptions> = {}) => {
  const config: UpstashRateLimitOptions = {
    limit: options.limit ?? DEFAULT_OPTIONS.limit,
    windowMs: options.windowMs ?? DEFAULT_OPTIONS.windowMs,
    url: options.url ?? "",
    token: options.token ?? "",
    timeoutMs: options.timeoutMs ?? 1_000,
    fetcher: options.fetcher ?? fetch,
    fallback: options.fallback ?? createChatRateLimiter(),
    dailyLimit: options.dailyLimit ?? configuredDailyLimit(),
    now: options.now ?? Date.now,
  };

  const limiter: ChatRateLimiter = async (request) => {
    const now = config.now();
    let response: Response;
    try {
      const identifier = await hashClientKey(request);
      const key = `chat:rate:v1:${identifier}`;
      const dailyKey = `chat:daily:v1:${dailyBucket(now)}`;
      response = await config.fetcher(config.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          UPSTASH_SCRIPT,
          2,
          key,
          dailyKey,
          config.windowMs,
          // 일일 키는 자정 직후 잔재가 남지 않도록 48시간이면 충분하다.
          172_800_000,
          config.limit,
        ]),
        signal: AbortSignal.timeout(config.timeoutMs),
        cache: "no-store",
      });
    } catch {
      // Upstash가 일시적으로 실패하면 인스턴스 제한기로 전환한다. 자격증명 자체가 없으면
      // 배포 설정 오류로 보고 채팅을 비활성화한다.
      return config.fallback(request);
    }

    if (response.status >= 400 && response.status < 500) {
      throw new ChatRateLimitConfigurationError();
    }

    try {
      const payload = (await response.json()) as { result?: unknown; error?: unknown };
      if (!response.ok || payload.error || !Array.isArray(payload.result)) throw new Error();

      const count = Number(payload.result[0]);
      const ttlMs = Number(payload.result[1]);
      const daily = Number(payload.result[2]);
      if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) throw new Error();
      if (count > config.limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1_000)),
          scope: "client",
        };
      }
      if (Number.isFinite(daily) && daily > config.dailyLimit) {
        console.warn(
          `[chat-rate-limit] 전역 일일 상한 소진 (${daily}/${config.dailyLimit}) — 다음 UTC 자정까지 챗을 닫는다`,
        );
        return {
          allowed: false,
          retryAfterSeconds: secondsUntilNextUtcDay(now),
          scope: "daily",
        };
      }

      return { allowed: true, retryAfterSeconds: 0 };
    } catch {
      return config.fallback(request);
    }
  };

  return limiter;
};

const createConfiguredChatRateLimiter = (
  env: ChatRateLimitEnvironment = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  },
  options: Partial<UpstashRateLimitOptions> = {},
): ChatRateLimiter => {
  const upstash = {
    url: env.UPSTASH_REDIS_REST_URL?.trim(),
    token: env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  };
  const marketplace = {
    url: env.KV_REST_API_URL?.trim(),
    token: env.KV_REST_API_TOKEN?.trim(),
  };
  const credentials =
    upstash.url && upstash.token
      ? upstash
      : marketplace.url && marketplace.token
        ? marketplace
        : null;
  if (!credentials) {
    // 배포 환경에는 모든 인스턴스가 공유하는 제한기가 필요하다.
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      console.error(
        "[chat-rate-limit] 공유 rate limiter(Upstash/KV) 자격증명이 없다 — 챗을 비활성화한다",
      );
      return () => {
        throw new ChatRateLimitConfigurationError();
      };
    }
    return createChatRateLimiter();
  }
  const { url, token } = credentials;
  return createUpstashChatRateLimiter({ ...options, url, token });
};

const chatRateLimiter = createConfiguredChatRateLimiter();

export {
  ChatRateLimitConfigurationError,
  chatRateLimiter,
  createChatRateLimiter,
  createConfiguredChatRateLimiter,
  createUpstashChatRateLimiter,
};
export type { ChatRateLimiter };
