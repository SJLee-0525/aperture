import { describe, expect, it } from "vitest";

import { readSseStream } from "@/features/chat/_lib/sse-stream";

/** 지정한 조각을 순서대로 흘리는 SSE 응답. */
const responseOf = (chunks: string[]): Response => {
  const encoder = new TextEncoder();
  let index = 0;
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index >= chunks.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
      },
    }),
  );
};

describe("readSseStream", () => {
  it("이벤트 블록의 data 페이로드만 넘긴다", async () => {
    const payloads: string[] = [];

    await readSseStream(
      responseOf(['event: x\ndata: {"a":1}\n\n', 'data: {"b":2}\n\n']),
      new AbortController().signal,
      (payload) => payloads.push(payload),
    );

    expect(payloads).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("조각 경계가 이벤트 경계와 어긋나도 블록을 복원한다", async () => {
    const payloads: string[] = [];

    await readSseStream(
      responseOf(['data: {"a"', ":1}\n", '\ndata: {"b":2}\n\n']),
      new AbortController().signal,
      (payload) => payloads.push(payload),
    );

    expect(payloads).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("CRLF 줄바꿈과 종료 표식을 걸러 낸다", async () => {
    const payloads: string[] = [];

    await readSseStream(
      responseOf(['data: {"a":1}\r\n\r\n', "data: [DONE]\r\n\r\n"]),
      new AbortController().signal,
      (payload) => payloads.push(payload),
    );

    expect(payloads).toEqual(['{"a":1}']);
  });

  it("마지막 블록에 빈 줄이 없어도 남은 버퍼를 넘긴다", async () => {
    const payloads: string[] = [];

    await readSseStream(responseOf(['data: {"a":1}']), new AbortController().signal, (payload) =>
      payloads.push(payload),
    );

    expect(payloads).toEqual(['{"a":1}']);
  });

  it("본문이 없으면 오류를 낸다", async () => {
    await expect(
      readSseStream(new Response(null), new AbortController().signal, () => undefined),
    ).rejects.toThrow("Upstream returned no stream");
  });

  it("중단되면 조용히 끝내지 않고 중단 사유를 던진다", async () => {
    const controller = new AbortController();
    const reason = new DOMException("timed out", "TimeoutError");
    const encoder = new TextEncoder();
    // 첫 조각을 넘긴 직후 중단한다. 다음 반복 조건에서 빠져나가는 경합 구간이다.
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(streamController) {
          streamController.enqueue(encoder.encode('data: {"a":1}\n\n'));
          controller.abort(reason);
        },
      }),
    );

    await expect(readSseStream(response, controller.signal, () => undefined)).rejects.toBe(reason);
  });

  it("정상 종료에도 reader 를 정리한다", async () => {
    const response = responseOf(['data: {"a":1}\n\n']);
    const body = response.body;

    await readSseStream(response, new AbortController().signal, () => undefined);

    // 잠금이 풀려 있어야 다시 읽을 수 있다.
    expect(() => body?.getReader()).not.toThrow();
  });

  it("소비자가 던진 오류에도 reader 를 정리한다", async () => {
    const response = responseOf(['data: {"a":1}\n\n']);
    const body = response.body;
    const failure = new Error("consumer failed");

    await expect(
      readSseStream(response, new AbortController().signal, () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(() => body?.getReader()).not.toThrow();
  });
});
