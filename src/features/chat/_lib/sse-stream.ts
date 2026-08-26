/**
 * 업스트림 스트림 하나에서 읽을 총 문자 수의 상한.
 *
 * 방출되는 답변은 `MAX_RESPONSE_CHARS`(1,200자)로 잘리지만 그 절단은 소비 단계에서 일어난다.
 * 제공자가 종료 이벤트를 보내지 않거나 같은 청크를 반복하면 이 파일의 버퍼가 무한히 늘어나고,
 * 유일한 상한이 요청 타임아웃이 된다. 정상 응답의 수십 배로 잡아 오작동에서만 걸리게 한다.
 */
const MAX_STREAM_CHARS = 200_000;

/**
 * text/event-stream 본문을 이벤트 블록 단위로 읽어 `data:` 페이로드만 넘긴다.
 * OpenAI Responses API 와 Gemini streamGenerateContent 가 같은 SSE 형식을 쓰므로
 * 제공자별 리더를 따로 두지 않는다. (`[DONE]` 종료 표식은 OpenAI 만 보내지만
 * 걸러도 Gemini 에 영향이 없어 여기서 함께 처리한다.)
 *
 * @param {Response} response
 * @param {AbortSignal} signal
 * @param {(payload: string) => void} onPayload
 * @returns {Promise<void>}
 * @throws {Error} 본문이 없거나 스트림이 `MAX_STREAM_CHARS` 를 넘을 때.
 */
const readSseStream = async (
  response: Response,
  signal: AbortSignal,
  onPayload: (payload: string) => void,
) => {
  if (!response.body) throw new Error("Upstream returned no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let totalChars = 0;

  const consume = (eventBlock: string) => {
    const payload = eventBlock
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (payload && payload !== "[DONE]") onPayload(payload);
  };

  let reachedEof = false;
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      const chunk = decoder.decode(value, { stream: !done }).replaceAll("\r\n", "\n");
      totalChars += chunk.length;
      // 부분 응답을 정상 완료로 넘기지 않는다. 이 파일은 잘린 답변이 완성된 답변으로
      // 나가는 것을 이미 오류로 다루므로, 상한 초과도 같은 방식으로 알린다.
      if (totalChars > MAX_STREAM_CHARS) {
        throw new Error(`Upstream stream exceeded ${MAX_STREAM_CHARS} characters`);
      }
      buffer += chunk;
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        consume(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) {
        reachedEof = true;
        break;
      }
    }
    // 조각을 읽은 직후 중단되면 반복문이 예외 없이 끝난다. 호출부가 이것을 정상 완료로
    // 읽으면 잘린 답변을 완성된 답변으로 내보낸다.
    // 끝까지 읽은 뒤에 신호가 끊긴 경우는 손실이 없으므로 정상 완료로 둔다.
    if (!reachedEof && signal.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new DOMException("Stream aborted", "AbortError");
    }
    if (buffer.trim()) consume(buffer);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};

export { MAX_STREAM_CHARS, readSseStream };
