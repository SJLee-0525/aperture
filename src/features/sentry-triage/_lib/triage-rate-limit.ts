type TriageRateLimitResult = {
  allowed: boolean;
  /** 오늘 몇 번째 호출인지. 자격증명이 없어 세지 못했으면 0. */
  count: number;
};

type TriageRateLimiter = () => Promise<TriageRateLimitResult>;

/** `process.env` 를 그대로 받을 수 있도록 색인 시그니처를 포함한다. */
type TriageRateLimitEnvironment = Record<string, string | undefined>;

type UpstashOptions = {
  url: string;
  token: string;
  limit: number;
  timeoutMs: number;
  fetcher: typeof fetch;
  now: () => number;
};

/** Alert Rule 조건이 1차 방어선이라 이 값은 비용 사고를 막는 상한이다. */
const DEFAULT_DAILY_LIMIT = 50;

/** 자정 직후 잔재가 남지 않을 만큼만 둔다. */
const KEY_TTL_MS = 172_800_000;

/**
 * 카운터 증가와 만료 설정을 한 번에 처리한다. 두 명령으로 나누면 첫 요청이
 * 만료 설정 전에 끊겼을 때 키가 영구히 남는다.
 */
const UPSTASH_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return count
`;

const ALLOW_WITHOUT_COUNT: TriageRateLimitResult = { allowed: true, count: 0 };

const dailyKey = (now: number): string =>
  `sentry-triage:daily:v1:${new Date(now).toISOString().slice(0, 10)}`;

const configuredLimit = (env: TriageRateLimitEnvironment): number => {
  const parsed = Number(env.SENTRY_TRIAGE_DAILY_LIMIT);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_LIMIT;
};

/**
 * 실패하면 통과시킨다.
 *
 * 챗봇(`chat-rate-limit.ts`)은 반대로 자격증명이 없으면 요청을 막는다. 챗은 방문자 트래픽이라
 * 제한기가 없으면 호출량에 상한이 없어진다. 트리아지는 Sentry Alert Rule 이 발동 횟수를
 * 제한하므로, 제한기 실패를 차단으로 처리하면 남는 결과는 비용 절감이 아니라 알림 누락이다.
 */
const createUpstashTriageRateLimiter = (options: UpstashOptions): TriageRateLimiter => {
  const { url, token, limit, timeoutMs, fetcher, now } = options;

  return async () => {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(["EVAL", UPSTASH_SCRIPT, 1, dailyKey(now()), KEY_TTL_MS]),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch {
      return ALLOW_WITHOUT_COUNT;
    }

    if (!response.ok) return ALLOW_WITHOUT_COUNT;

    try {
      const payload = (await response.json()) as { result?: unknown; error?: unknown };
      const count = Number(payload.result);
      if (payload.error || !Number.isFinite(count)) return ALLOW_WITHOUT_COUNT;
      return { allowed: count <= limit, count };
    } catch {
      return ALLOW_WITHOUT_COUNT;
    }
  };
};

const resolveCredentials = (env: TriageRateLimitEnvironment) => {
  const upstash = {
    url: env.UPSTASH_REDIS_REST_URL?.trim(),
    token: env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  };
  if (upstash.url && upstash.token) return { url: upstash.url, token: upstash.token };
  const marketplace = { url: env.KV_REST_API_URL?.trim(), token: env.KV_REST_API_TOKEN?.trim() };
  if (marketplace.url && marketplace.token)
    return { url: marketplace.url, token: marketplace.token };
  return null;
};

/**
 * 하루 LLM 호출 상한을 세는 제한기를 만든다.
 * 자격증명이 없으면 세지 않고 통과시키는 제한기를 돌려준다.
 *
 * @param env 자격증명 출처. Upstash 직접 설정이 Vercel Marketplace 주입값보다 우선한다.
 * @param overrides 테스트용 주입.
 */
const getTriageRateLimiter = (
  env: TriageRateLimitEnvironment = process.env,
  overrides: Partial<UpstashOptions> = {},
): TriageRateLimiter => {
  const credentials = resolveCredentials(env);
  if (!credentials) {
    console.warn(
      "[triage-rate-limit] no shared counter is configured; running without a daily cap",
    );
    return async () => ALLOW_WITHOUT_COUNT;
  }

  // overrides 를 뒤에 다시 펼치지 않는다. 값이 undefined 인 키가 있으면 아래 기본값을
  // 덮어써 limit 이 undefined 가 되고, 모든 알림이 상한 초과로 판정 없이 나간다.
  return createUpstashTriageRateLimiter({
    ...credentials,
    limit: overrides.limit ?? configuredLimit(env),
    timeoutMs: overrides.timeoutMs ?? 1_000,
    fetcher: overrides.fetcher ?? fetch,
    now: overrides.now ?? Date.now,
  });
};

export { DEFAULT_DAILY_LIMIT, getTriageRateLimiter };
