import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { fetchWithRetry } from "@/lib/supabase/public/retry-fetch";

type RestRequest = {
  /** `/rest/v1/` 뒤에 붙는 경로. 테이블명 또는 `rpc/함수명`. */
  path: string;
  params?: URLSearchParams;
  method?: "POST" | "DELETE";
  /**
   * 사용자 access token. 인가는 RLS 가 하고, 이 값은 Authorization 헤더로만 나간다.
   * publishable key 는 언제나 apikey 헤더 전용이다 — 둘을 섞으면 RLS 가 보는 주체가 바뀐다.
   */
  accessToken?: string;
  /** JSON 본문. 있으면 Content-Type 을 함께 붙인다. */
  body?: unknown;
  /** Range·Prefer 처럼 호출부만 아는 헤더. */
  headers?: Record<string, string>;
  /** ISR Data Cache 설정. 생략하면 `no-store` 다. */
  cache?: { revalidate: number; tags: string[] };
  /**
   * 5xx·네트워크 오류를 다시 시도한다. **읽기 전용 요청에만 켠다** — upsert·delete 를
   * 재시도하면 같은 쓰기가 두 번 나갈 수 있다.
   */
  retry?: boolean;
  signal?: AbortSignal;
};

/**
 * Supabase PostgREST 호출의 단일 진입점.
 *
 * 헤더 규약(apikey/Authorization 분리)과 재시도 여부를 여기서만 정한다. 호출부마다
 * 헤더를 조립하면 그 규약이 파일 수만큼 늘어나고 재시도 정책이 경로마다 갈린다.
 * 응답 상태 판정은 호출부가 한다 — 실패 문구와 로그 대상이 경로마다 다르다.
 *
 * @param request 경로와 전송 옵션.
 * @returns 상태 코드를 그대로 담은 응답.
 */
const restFetch = (request: RestRequest): Promise<Response> => {
  const query = request.params?.toString();
  const url = `${supabaseUrl()}/rest/v1/${request.path}${query ? `?${query}` : ""}`;
  const init: RequestInit & { next?: { revalidate: number; tags: string[] } } = {
    headers: {
      apikey: supabasePublishableKey(),
      ...(request.accessToken ? { Authorization: `Bearer ${request.accessToken}` } : {}),
      ...(request.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...request.headers,
    },
    ...(request.method ? { method: request.method } : {}),
    ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    ...(request.cache ? { next: request.cache } : { cache: "no-store" as const }),
    ...(request.signal ? { signal: request.signal } : {}),
  };

  return request.retry ? fetchWithRetry(url, init) : fetch(url, init);
};

export { restFetch };
