/** 요청 하나에 걸린 취소 신호와 마감. */
type ChatRequestDeadline = {
  signal: AbortSignal;
  /** 마감 때문에 끊겼는지. 공개 오류 코드가 TIMEOUT 인지 UPSTREAM_ERROR 인지를 가른다. */
  timedOut: () => boolean;
  /** 작업과 마감 중 먼저 끝나는 쪽을 취한다. */
  race: <T>(work: Promise<T>) => Promise<T>;
  /** 방문자가 스트림을 끊었을 때처럼 밖에서 취소한다. */
  abort: (reason?: unknown) => void;
  /** 타이머와 리스너를 걷는다. 응답을 보낸 뒤 반드시 부른다. */
  cleanup: () => void;
};

/**
 * 요청 취소와 제한 시간을 하나의 신호로 묶는다.
 *
 * 방문자가 탭을 닫아 요청이 끊기는 것과 제한 시간을 넘기는 것은 원인이 다르지만 이후 처리는
 * 같다. 진행 중인 provider 호출과 문맥 조회를 같은 신호로 끊는다.
 *
 * 마감 promise 는 reject 만 하므로 race 로만 쓴다. 직접 await 하면 성공 경로에서 영원히 남는다.
 */
const createChatRequestDeadline = (request: Request, timeoutMs: number): ChatRequestDeadline => {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromRequest = () => controller.abort(request.signal.reason);
  request.signal.addEventListener("abort", abortFromRequest, { once: true });
  if (request.signal.aborted) abortFromRequest();

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      const error = new DOMException("Chat request timed out", "TimeoutError");
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    race: (work) => Promise.race([work, deadline]),
    abort: (reason) => controller.abort(reason),
    cleanup: () => {
      if (timeout) clearTimeout(timeout);
      request.signal.removeEventListener("abort", abortFromRequest);
    },
  };
};

export { createChatRequestDeadline };
