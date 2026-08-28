/**
 * 스트림을 상한까지만 읽는다. 상한을 넘는 순간 읽기를 멈추고 스트림을 취소한다.
 *
 * 본문을 통째로 읽은 뒤 크기를 재면 그 사이에 상한을 넘는 본문이 이미 메모리에 올라간다.
 * 요청과 응답 양쪽이 같은 절단 규칙을 쓴다.
 *
 * @param stream 읽을 본문 스트림.
 * @param maxBytes 허용하는 최대 바이트 수.
 * @returns 이어 붙인 본문. 상한을 넘으면 `null`.
 */
const readLimitedStream = async (
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array | null> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel().catch(() => undefined);
          return null;
        }
        chunks.push(value);
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
};

/**
 * 요청 본문을 상한까지만 읽어 문자열로 돌려준다.
 *
 * @param request 읽을 요청.
 * @param maxBytes 허용하는 최대 바이트 수.
 * @returns 본문 문자열. 상한을 넘으면 `null`.
 */
const readLimitedBody = async (request: Request, maxBytes: number): Promise<string | null> => {
  const body = request.body;
  // 본문 스트림이 없는 요청(테스트 대역 포함)은 기존 경로로 읽는다.
  if (!body) {
    const text = await request.text();
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text;
  }

  const bytes = await readLimitedStream(body, maxBytes);
  return bytes === null ? null : new TextDecoder().decode(bytes);
};

/**
 * 응답 본문을 상한까지만 읽어 바이트로 돌려준다. 이미지 프록시처럼 원문을 그대로
 * 되돌려주는 경로가 쓴다.
 *
 * @param response 읽을 응답.
 * @param maxBytes 허용하는 최대 바이트 수.
 * @returns 본문 바이트. 상한을 넘으면 `null`.
 */
const readLimitedBytes = async (
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | null> => {
  const body = response.body;
  if (!body) return new Uint8Array();
  return readLimitedStream(body, maxBytes);
};

/**
 * 선언된 본문 크기가 상한을 넘는지 본다. 본문을 읽기 전에 거절할 수 있는 경우만 잡는다.
 *
 * `Transfer-Encoding: chunked` 요청에는 `Content-Length` 가 없어 이 검사를 통과한다.
 * 그래서 이 함수는 `readLimitedBody` 를 대신하지 않고 앞에 덧붙는다.
 *
 * @param headers 요청 또는 응답 헤더.
 * @param maxBytes 허용하는 최대 바이트 수.
 * @returns 선언된 크기가 상한을 넘으면 `true`.
 */
const declaredBodyTooLarge = (headers: Headers, maxBytes: number): boolean => {
  const declared = Number(headers.get("content-length"));
  return Number.isFinite(declared) && declared > maxBytes;
};

export { declaredBodyTooLarge, readLimitedBody, readLimitedBytes };
