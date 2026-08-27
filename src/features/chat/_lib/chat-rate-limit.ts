import { clientAddress } from "@/lib/rate-limit/client-address";
import {
  DAILY_KEY_TTL_MS,
  positiveIntOr,
  retryAfterSeconds,
  utcDayBucket,
} from "@/lib/rate-limit/counter";
import {
  evalUpstashScript,
  resolveUpstashCredentials,
  type UpstashEvalResult,
} from "@/lib/rate-limit/upstash-counter";

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
 * 트리아지의 상한(`DEFAULT_TRIAGE_DAILY_LIMIT`)과 이름을 나눈다 — 두 값의 근거가 다르다.
 */
const DEFAULT_CHAT_DAILY_LIMIT = 1_000;

const configuredDailyLimit = (): number =>
  positiveIntOr(process.env.CHAT_DAILY_LIMIT, DEFAULT_CHAT_DAILY_LIMIT);

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

const configuredDailyInputCharLimit = (): number =>
  positiveIntOr(process.env.CHAT_DAILY_INPUT_CHAR_LIMIT, DEFAULT_DAILY_INPUT_CHAR_LIMIT);

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

/** 입력 문자 예산 카운터 키. 요청 수 카운터와 같은 UTC 날짜 버킷을 쓴다. */
const inputCharsKey = (now: number): string => `chat:chars:v1:${utcDayBucket(now)}`;

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

const clientKey = (request: Request): string => clientAddress(request.headers);

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
    let outcome: UpstashEvalResult;
    try {
      const identifier = await hashClientKey(request);
      outcome = await evalUpstashScript({
        credentials: { url: config.url, token: config.token },
        script: UPSTASH_SCRIPT,
        keys: [
          `chat:rate:v1:${identifier}`,
          `chat:daily:v1:${utcDayBucket(now)}`,
          inputCharsKey(now),
        ],
        args: [config.windowMs, DAILY_KEY_TTL_MS, config.limit],
        timeoutMs: config.timeoutMs,
        fetcher: config.fetcher,
      });
    } catch {
      return config.fallback(request);
    }

    // client 는 401·403·404 뿐이다. 자격증명이나 토큰 권한 문제라 인스턴스 제한기로
    // 물러나면 배포 설정 오류가 드러나지 않으므로 채팅을 비활성화한다.
    if (!outcome.ok && outcome.reason === "client") throw new ChatRateLimitConfigurationError();
    // 429(무료 티어 일일 명령 상한)를 포함한 그 밖의 실패는 일시적 장애로 보고
    // 인스턴스 제한기로 전환한다. 로그에 남겨 조용한 성능 저하로 묻히지 않게 한다.
    if (!outcome.ok) {
      console.warn(
        `[chat-rate-limit] upstash ${outcome.reason}${"status" in outcome ? ` ${outcome.status}` : ""}; falling back to in-memory limiter`,
      );
      return config.fallback(request);
    }
    if (!Array.isArray(outcome.value)) return config.fallback(request);

    const count = Number(outcome.value[0]);
    const ttlMs = Number(outcome.value[1]);
    const daily = Number(outcome.value[2]);
    const chars = Number(outcome.value[3]);
    // 요소가 없는 응답도 받아들인다. 예산 판정만 건너뛰고 요청 수 제한은 그대로 동작한다.
    const dailyInputChars = Number.isFinite(chars) ? { dailyInputChars: chars } : {};
    if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) return config.fallback(request);
    if (count > config.limit) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(ttlMs),
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
  };

  return limiter;
};

const defaultEnvironment = (): ChatRateLimitEnvironment => ({
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
});

const createConfiguredChatRateLimiter = (
  env: ChatRateLimitEnvironment = defaultEnvironment(),
  options: Partial<UpstashRateLimitOptions> = {},
): ChatRateLimiter => {
  const credentials = resolveUpstashCredentials(env);
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
  const credentials = resolveUpstashCredentials(options.env ?? defaultEnvironment());
  if (!credentials) return;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  try {
    const outcome = await evalUpstashScript({
      credentials,
      script: UPSTASH_RECORD_SCRIPT,
      keys: [inputCharsKey(now())],
      args: [Math.floor(chars), DAILY_KEY_TTL_MS],
      timeoutMs: 1_000,
      fetcher,
    });
    // 결과를 보지 않으면 토큰 권한 문제나 Lua 오류에서 카운터가 영원히 0 에 머물고,
    // 예산이 한 번도 발동하지 않는다. 자격증명은 로그에 넣지 않는다.
    if (!outcome.ok) {
      const detail = "status" in outcome ? `${outcome.reason} ${outcome.status}` : outcome.reason;
      console.warn(`[chat-input] 입력 문자 기록 실패 (${detail})`);
      return;
    }
    if (!Number.isFinite(Number(outcome.value))) {
      console.warn("[chat-input] 입력 문자 기록이 예상 밖 응답을 받았다");
    }
  } catch {
    // 기록 실패는 요청을 막지 않는다. 예산 판정은 다음 요청의 조회값으로 이어진다.
    console.warn("[chat-input] 입력 문자 기록을 보내지 못했다");
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
export type { ChatRateLimiter };
