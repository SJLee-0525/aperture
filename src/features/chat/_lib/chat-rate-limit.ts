type ChatRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  /** 전역 일일 한도 초과 여부. */
  scope?: "client" | "daily";
  /**
   * 오늘 전역에서 프롬프트로 보낸 입력 문자 수. 공유 카운터가 있을 때만 채워지므로,
   * 값이 없으면 호출부는 예산을 판정하지 않는다.
   */
  dailyInputChars?: number;
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
 * 하루 입력 문자 예산의 기본값.
 *
 * 요청 수 상한만으로는 비용이 잡히지 않는다. 글 본문을 실은 요청 하나가 상한(25,000자)에
 * 가까운 문맥을 보내므로, 요청 수가 같아도 하루 비용은 몇 배까지 벌어진다. 이 예산을
 * 넘으면 요청을 거절하는 대신 문맥을 빼고 답한다.
 *
 * 문자 수로 세는 이유는 토크나이저를 의존성으로 들이지 않기 위해서다. 한국어는 문자당
 * 토큰이 1개를 조금 넘어, 문자 수는 토큰 수의 보수적인 하한이다.
 */
const DEFAULT_DAILY_INPUT_CHAR_LIMIT = 2_000_000;

const configuredDailyInputCharLimit = (): number => {
  const parsed = Number(process.env.CHAT_DAILY_INPUT_CHAR_LIMIT);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_DAILY_INPUT_CHAR_LIMIT;
};

/**
 * IP 윈도우와 전역 일일 카운터를 하나의 EVAL에서 갱신하고, 오늘까지 쓴 입력 문자 수를 함께 읽는다.
 * IP 제한에 걸린 요청은 LLM 을 호출하지 않으므로 일일 카운터도 올리지 않는다(daily = -1 반환).
 *
 * 반환 길이는 항상 4다. Lua 테이블은 첫 false/nil 에서 잘려 RESP 로 나가므로,
 * 없는 키의 `GET`(false)을 `tonumber(...) or 0` 으로 감싸지 않으면 요소가 사라진다.
 */
const UPSTASH_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
local chars = tonumber(redis.call("GET", KEYS[3])) or 0
if count > tonumber(ARGV[3]) then
  return { count, ttl, -1, chars }
end
local daily = redis.call("INCR", KEYS[2])
if daily == 1 then
  redis.call("PEXPIRE", KEYS[2], ARGV[2])
end
return { count, ttl, daily, chars }
`;

/** 오늘 쓴 입력 문자 수를 누적한다. 신규 키만 만료를 건다. */
const UPSTASH_RECORD_SCRIPT = `
local total = redis.call("INCRBY", KEYS[1], ARGV[1])
if total == tonumber(ARGV[1]) then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return total
`;

/**
 * 모든 인스턴스가 공유하는 UTC 날짜 키.
 *
 * @param {number} now
 * @returns {string}
 */
const dailyBucket = (now: number): string => new Date(now).toISOString().slice(0, 10);

/** 입력 문자 예산 카운터 키. 요청 수 카운터와 같은 UTC 날짜 버킷을 쓴다. */
const inputCharsKey = (now: number): string => `chat:chars:v1:${dailyBucket(now)}`;

/** 자정 직후 잔재가 남지 않도록 하루 버킷 키에 거는 만료. */
const DAILY_KEY_TTL_MS = 172_800_000;

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
      const charsKey = inputCharsKey(now);
      response = await config.fetcher(config.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          UPSTASH_SCRIPT,
          3,
          key,
          dailyKey,
          charsKey,
          config.windowMs,
          DAILY_KEY_TTL_MS,
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
      const chars = Number(payload.result[3]);
      // 요소가 없는 응답도 받아들인다. 예산 판정만 건너뛰고 요청 수 제한은 그대로 동작한다.
      const dailyInputChars = Number.isFinite(chars) ? { dailyInputChars: chars } : {};
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

      return { allowed: true, retryAfterSeconds: 0, ...dailyInputChars };
    } catch {
      return config.fallback(request);
    }
  };

  return limiter;
};

const defaultEnvironment = (): ChatRateLimitEnvironment => ({
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
});

/** Upstash 를 먼저 보고 Vercel 마켓플레이스 변수로 물러난다. 둘 다 없으면 `null`. */
const resolveCredentials = (
  env: ChatRateLimitEnvironment,
): { url: string; token: string } | null => {
  const upstash = {
    url: env.UPSTASH_REDIS_REST_URL?.trim(),
    token: env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  };
  const marketplace = {
    url: env.KV_REST_API_URL?.trim(),
    token: env.KV_REST_API_TOKEN?.trim(),
  };
  if (upstash.url && upstash.token) return { url: upstash.url, token: upstash.token };
  if (marketplace.url && marketplace.token) {
    return { url: marketplace.url, token: marketplace.token };
  }
  return null;
};

const createConfiguredChatRateLimiter = (
  env: ChatRateLimitEnvironment = defaultEnvironment(),
  options: Partial<UpstashRateLimitOptions> = {},
): ChatRateLimiter => {
  const credentials = resolveCredentials(env);
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

/**
 * 이번 요청이 프롬프트로 보낸 입력 문자 수를 오늘 버킷에 더한다.
 *
 * 공유 카운터가 없으면 아무것도 하지 않는다. 기록 실패는 요청을 막지 않으며,
 * 그만큼 예산 소진이 늦게 감지된다.
 *
 * @param {number} chars 이번 요청의 입력 문자 수.
 * @param {{ env?: ChatRateLimitEnvironment; fetcher?: typeof fetch; now?: () => number }} [options]
 * @returns {Promise<void>}
 */
const recordChatInputChars = async (
  chars: number,
  options: { env?: ChatRateLimitEnvironment; fetcher?: typeof fetch; now?: () => number } = {},
): Promise<void> => {
  if (!Number.isFinite(chars) || chars <= 0) return;
  const credentials = resolveCredentials(options.env ?? defaultEnvironment());
  if (!credentials) return;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  try {
    await fetcher(credentials.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credentials.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        "EVAL",
        UPSTASH_RECORD_SCRIPT,
        1,
        inputCharsKey(now()),
        Math.floor(chars),
        DAILY_KEY_TTL_MS,
      ]),
      signal: AbortSignal.timeout(1_000),
      cache: "no-store",
    });
  } catch {
    // 예산 판정은 다음 요청의 조회값으로 이어진다.
  }
};

export {
  ChatRateLimitConfigurationError,
  chatRateLimiter,
  configuredDailyInputCharLimit,
  createChatRateLimiter,
  createConfiguredChatRateLimiter,
  createUpstashChatRateLimiter,
  recordChatInputChars,
};
export type { ChatRateLimitResult };
export type { ChatRateLimiter };
