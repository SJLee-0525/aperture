/** 첫 시도를 포함한 최대 호출 횟수. */
const MAX_ATTEMPTS = 3;

/** 재시도 간격의 기준값. 시도마다 배수로 늘린다. */
const BASE_DELAY_MS = 400;

/**
 * 대기 중 요청이 중단되면 남은 시간을 기다리지 않고 끝낸다.
 *
 * @param {number} ms 대기 시간.
 * @param {AbortSignal | null} [signal] 호출자가 넘긴 취소 신호.
 * @returns {Promise<void>} 시간이 지나거나 중단되면 이행한다.
 */
const delay = (ms: number, signal?: AbortSignal | null): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });

/**
 * 5xx 는 같은 요청을 다시 보내면 성공할 수 있다.
 * 429 는 재시도하지 않는다 — Supabase 의 요청 제한 응답은 곧바로 풀리지 않는다.
 */
const isRetriableStatus = (status: number): boolean => status >= 500;

/**
 * PostgREST 읽기를 네트워크 오류와 일시적 상태 코드에 한해 다시 시도한다.
 *
 * 정적 생성은 페이지 하나의 읽기가 실패하면 빌드 전체를 중단한다. 빌드 컨테이너에서
 * 원본 연결이 한 번 ETIMEDOUT 되는 것만으로 배포가 깨지지 않게 한다.
 * 대상은 읽기 전용 요청이므로 같은 요청을 다시 보내도 데이터가 바뀌지 않는다.
 *
 * @param {string} url 요청 URL.
 * @param {RequestInit} [init] fetch 옵션. `signal` 이 중단되면 재시도하지 않는다.
 * @returns {Promise<Response>} 마지막 시도의 응답. 모든 시도가 던지면 마지막 오류를 그대로 던진다.
 */
const fetchWithRetry = async (url: string, init?: RequestInit): Promise<Response> => {
  for (let attempt = 1; ; attempt += 1) {
    const last = attempt >= MAX_ATTEMPTS;
    try {
      const response = await fetch(url, init);
      if (last || !isRetriableStatus(response.status)) return response;
      // 읽지 않은 본문을 남기면 연결이 반환되지 않는다. 다음 시도 전에 닫는다.
      await response.body?.cancel().catch(() => undefined);
    } catch (caught) {
      if (last || init?.signal?.aborted) throw caught;
    }
    await delay(BASE_DELAY_MS * attempt, init?.signal);
    // 대기 중에 중단됐다면 다시 보내지 않는다. 취소 사유는 fetch 가 던지는 값과 같다.
    if (init?.signal?.aborted) throw init.signal.reason;
  }
};

export { fetchWithRetry };
