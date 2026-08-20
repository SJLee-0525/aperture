/**
 * 요청 본문을 상한까지만 읽는다. 상한을 넘는 순간 읽기를 멈추고 스트림을 취소한다.
 *
 * `Content-Length` 선검사는 `Transfer-Encoding: chunked` 요청에 헤더가 없어 통과시킨다.
 * 본문을 통째로 읽은 뒤 크기를 재면 그 사이에 상한을 넘는 본문이 메모리에 올라간다.
 *
 * @param {Request} request 읽을 요청.
 * @param {number} maxBytes 허용하는 최대 바이트 수.
 * @returns {Promise<string | null>} 본문 문자열. 상한을 넘으면 `null`.
 */
const readLimitedBody = async (request: Request, maxBytes: number): Promise<string | null> => {
  const body = request.body;
  // 본문 스트림이 없는 요청(테스트 대역 포함)은 기존 경로로 읽는다.
  if (!body) {
    const text = await request.text();
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel().catch(() => undefined);
          return null;
        }
        text += decoder.decode(value, { stream: true });
      }
      if (done) break;
    }
    return `${text}${decoder.decode()}`;
  } finally {
    reader.releaseLock();
  }
};

export { readLimitedBody };
