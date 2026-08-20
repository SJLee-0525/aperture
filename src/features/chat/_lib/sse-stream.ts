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

  const consume = (eventBlock: string) => {
    const payload = eventBlock
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (payload && payload !== "[DONE]") onPayload(payload);
  };

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replaceAll("\r\n", "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        consume(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    // 조각을 읽은 직후 중단되면 반복문이 예외 없이 끝난다. 호출부가 이것을 정상 완료로
    // 읽으면 잘린 답변을 완성된 답변으로 내보낸다.
    if (signal.aborted) {
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

export { readSseStream };
