type ChatRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** 전역 일일 예산 소진으로 막힌 경우 — IP 제한과 사용자 안내 문구가 다르다. */
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
  /** 전역 일일 상한 — IP 로테이션으로 IP 제한을 우회해도 하루 총량은 넘지 못한다. */
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
  limit: 6,
  windowMs: 60_000,
  maxEntries: 500,
};

/**
 * 기본 전역 일일 상한 — 개인 포트폴리오의 정상 트래픽이 절대 닿지 않을 높이로 잡는다.
 * 전역 카운터는 그 자체가 self-DoS 표면이라(1명이 태우면 그날 전원 차단) 낮게 잡으면 안 된다.
 * 역할은 "지갑 방어"가 아니라 프로바이더 예산 상한에 닿기 전 조기 차단이다.
 */
const DEFAULT_DAILY_LIMIT = 500;

const configuredDailyLimit = (): number => {
  const parsed = Number(process.env.CHAT_DAILY_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_LIMIT;
};

/**
 * IP 윈도우와 전역 일일 카운터를 한 번의 EVAL 로 처리한다 —
 * 왕복이 늘면 챗 응답 지연이 그대로 커지고, 두 카운터가 서로 다른 순간을 보게 된다.
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
 * UTC 기준 하루 키 — 인스턴스마다 로컬 타임존이 달라도 같은 버킷을 가리킨다.
 *
 * @param {number} now
 * @returns {string}
 */
const dailyBucket = (now: number): string => new Date(now).toISOString().slice(0, 10);

/**
 * 다음 UTC 자정까지 남은 초 — 일일 상한의 Retry-After 는 리셋 시각이어야 의미가 있다.
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
 * 헤더만 바꿔가며 매 요청 새 버킷을 받아 IP 제한이 통째로 무력화된다.
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
      // ★ 의도적 비대칭: 자격증명 자체가 없으면 챗을 닫지만(createConfiguredChatRateLimiter),
      // 자격증명이 있는데 Upstash 가 일시 장애(네트워크·타임아웃·5xx)면 가용성을 택해
      // 인스턴스 limiter 로 내려간다. 이 폴백은 서버리스에서 동시 요청으로 우회되므로
      // 장애 시간 동안은 상한이 느슨해지는 것을 감수한다 — 설정 실수(영구)와 달리
      // 블립(수초~수분)까지 챗을 닫으면 정상 방문자 손실이 더 크다고 봤다.
      // 비용 방어의 최후 보루는 프로바이더 콘솔의 예산 상한이다.
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
    // 서버리스에서 인스턴스 limiter 는 인스턴스마다 별도 카운터라, 동시 요청을 늘리는 것만으로
    // 우회된다. 배포 환경에서 조용히 강등하면 "제한이 있다"는 착각만 남으므로 챗을 닫는다.
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
