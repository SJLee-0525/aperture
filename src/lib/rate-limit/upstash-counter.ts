/**
 * Upstash Redis REST 로 Lua 스크립트를 실행하는 전송 계층.
 *
 * 카운터를 쓰는 곳마다 정책이 다르다. 챗은 자격증명이 없으면 요청을 막고, 트리아지는 통과시키며,
 * 관리자 표면은 통과시키되 실패만 센다. 그래서 이 파일은 요청을 보내고 결과를 분류하기만 하고,
 * 분류된 결과로 무엇을 할지는 호출부가 정한다.
 */

/** 재시도해도 같은 결과가 나오는 상태 코드. 나머지 4xx 는 일시적 장애로 다룬다. */
const PERMANENT_CLIENT_STATUSES = new Set([401, 403, 404]);

type UpstashEnvironment = Record<string, string | undefined>;

type UpstashCredentials = { url: string; token: string };

/**
 * EVAL 한 번의 결과.
 *
 * `client` 와 `server` 를 나누는 기준은 재시도로 달라지는가다. 401·403·404 는 자격증명이나
 * 토큰 권한 문제라 같은 요청이 계속 실패하지만, 429(무료 티어 일일 명령 상한)와 나머지
 * 4xx 는 시간이 지나면 풀리므로 5xx 와 같은 일시적 장애로 분류한다. 429 를 `client` 에
 * 넣으면 챗을 전역 차단하는 호출부가 자격증명이 멀쩡한데도 그날 남은 시간 챗을 끈다.
 */
type UpstashEvalResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "network" }
  | { ok: false; reason: "client"; status: number }
  | { ok: false; reason: "server"; status: number }
  | { ok: false; reason: "payload" };

type UpstashEvalOptions = {
  credentials: UpstashCredentials;
  script: string;
  /** Lua `KEYS` 로 들어갈 값. 개수는 요청 본문에 그대로 실린다. */
  keys: string[];
  /** Lua `ARGV` 로 들어갈 값. */
  args: (string | number)[];
  timeoutMs: number;
  fetcher: typeof fetch;
};

/**
 * Upstash 직접 설정을 먼저 보고 Vercel Marketplace 주입값으로 물러난다.
 *
 * @returns 두 쌍 모두 비어 있으면 `null`.
 */
const resolveUpstashCredentials = (env: UpstashEnvironment): UpstashCredentials | null => {
  const upstash = {
    url: env.UPSTASH_REDIS_REST_URL?.trim(),
    token: env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  };
  if (upstash.url && upstash.token) return { url: upstash.url, token: upstash.token };

  const marketplace = {
    url: env.KV_REST_API_URL?.trim(),
    token: env.KV_REST_API_TOKEN?.trim(),
  };
  if (marketplace.url && marketplace.token) {
    return { url: marketplace.url, token: marketplace.token };
  }
  return null;
};

/**
 * Lua 스크립트를 한 번 실행하고 결과를 분류한다.
 *
 * 응답 본문의 `error` 필드와 파싱 실패를 모두 `payload` 로 묶는다. 둘 다 스크립트가 값을
 * 돌려주지 못한 상태이고, 호출부가 구분해서 처리할 것이 없다.
 */
const evalUpstashScript = async (options: UpstashEvalOptions): Promise<UpstashEvalResult> => {
  const { credentials, script, keys, args, timeoutMs, fetcher } = options;

  let response: Response;
  try {
    response = await fetcher(credentials.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credentials.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, keys.length, ...keys, ...args]),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  if (PERMANENT_CLIENT_STATUSES.has(response.status)) {
    return { ok: false, reason: "client", status: response.status };
  }
  if (!response.ok) return { ok: false, reason: "server", status: response.status };

  try {
    const payload = (await response.json()) as { result?: unknown; error?: unknown };
    if (payload.error) return { ok: false, reason: "payload" };
    return { ok: true, value: payload.result };
  } catch {
    return { ok: false, reason: "payload" };
  }
};

export { evalUpstashScript, resolveUpstashCredentials };
export type { UpstashCredentials, UpstashEnvironment, UpstashEvalResult };
