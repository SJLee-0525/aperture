import {
  DAILY_KEY_TTL_MS,
  INCREMENT_WITH_EXPIRY_SCRIPT,
  positiveIntOr,
  utcDayBucket,
} from "@/lib/rate-limit/counter";
import {
  evalUpstashScript,
  resolveUpstashCredentials,
  type UpstashCredentials,
  type UpstashEnvironment,
} from "@/lib/rate-limit/upstash-counter";

type TriageRateLimitResult = {
  allowed: boolean;
  /** 오늘 몇 번째 호출인지. 자격증명이 없어 세지 못했으면 0. */
  count: number;
};

type TriageRateLimiter = () => Promise<TriageRateLimitResult>;

type UpstashOptions = UpstashCredentials & {
  limit: number;
  timeoutMs: number;
  fetcher: typeof fetch;
  now: () => number;
};

/** Alert Rule 조건이 1차 방어선이라 이 값은 비용 사고를 막는 상한이다. */
const DEFAULT_TRIAGE_DAILY_LIMIT = 50;

const ALLOW_WITHOUT_COUNT: TriageRateLimitResult = { allowed: true, count: 0 };

const dailyKey = (now: number): string => `sentry-triage:daily:v1:${utcDayBucket(now)}`;

const configuredLimit = (env: UpstashEnvironment): number =>
  positiveIntOr(env.SENTRY_TRIAGE_DAILY_LIMIT, DEFAULT_TRIAGE_DAILY_LIMIT);

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
    const outcome = await evalUpstashScript({
      credentials: { url, token },
      script: INCREMENT_WITH_EXPIRY_SCRIPT,
      keys: [dailyKey(now())],
      args: [DAILY_KEY_TTL_MS],
      timeoutMs,
      fetcher,
    });
    if (!outcome.ok) return ALLOW_WITHOUT_COUNT;

    const count = Number(outcome.value);
    if (!Number.isFinite(count)) return ALLOW_WITHOUT_COUNT;
    return { allowed: count <= limit, count };
  };
};

/**
 * 하루 LLM 호출 상한을 세는 제한기를 만든다.
 * 자격증명이 없으면 세지 않고 통과시키는 제한기를 돌려준다.
 *
 * @param env 자격증명 출처. Upstash 직접 설정이 Vercel Marketplace 주입값보다 우선한다.
 * @param overrides 테스트용 주입.
 */
const getTriageRateLimiter = (
  env: UpstashEnvironment = process.env,
  overrides: Partial<UpstashOptions> = {},
): TriageRateLimiter => {
  const credentials = resolveUpstashCredentials(env);
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

export { DEFAULT_TRIAGE_DAILY_LIMIT, getTriageRateLimiter };
