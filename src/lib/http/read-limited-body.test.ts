import { describe, expect, it } from "vitest";

import {
  declaredBodyTooLarge,
  readLimitedBody,
  readLimitedBytes,
} from "@/lib/http/read-limited-body";

const streamOf = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });

const requestOf = (chunks: string[]) =>
  new Request("https://example.com/api", {
    method: "POST",
    body: streamOf(chunks),
    // Node 의 fetch 는 스트림 본문에 이 옵션을 요구한다.
    duplex: "half",
  } as RequestInit & { duplex: "half" });

describe("declaredBodyTooLarge", () => {
  it("선언된 크기가 상한을 넘으면 참이다", () => {
    expect(declaredBodyTooLarge(new Headers({ "content-length": "101" }), 100)).toBe(true);
  });

  it("상한과 같으면 통과시킨다", () => {
    expect(declaredBodyTooLarge(new Headers({ "content-length": "100" }), 100)).toBe(false);
  });

  it("헤더가 없거나 숫자가 아니면 판단하지 않는다", () => {
    // chunked 요청에는 Content-Length 가 없다. 여기서 막으면 정상 요청이 끊긴다.
    expect(declaredBodyTooLarge(new Headers(), 100)).toBe(false);
    expect(declaredBodyTooLarge(new Headers({ "content-length": "not-a-number" }), 100)).toBe(
      false,
    );
  });
});

describe("readLimitedBody", () => {
  it("상한 이내면 본문을 그대로 돌려준다", async () => {
    await expect(readLimitedBody(requestOf(["hello ", "world"]), 100)).resolves.toBe("hello world");
  });

  it("상한을 넘으면 null 이다", async () => {
    await expect(readLimitedBody(requestOf(["0123456789", "0123456789"]), 15)).resolves.toBeNull();
  });

  it("멀티바이트 문자가 조각 경계에 걸려도 온전히 디코드한다", async () => {
    const bytes = new TextEncoder().encode("한글");
    const split = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2));
        controller.close();
      },
    });
    const request = new Request("https://example.com/api", {
      method: "POST",
      body: split,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readLimitedBody(request, 100)).resolves.toBe("한글");
  });

  it("바이트 상한이지 문자 수 상한이 아니다", async () => {
    // "한글" 은 UTF-8 로 6바이트다. 문자 수로 세면 상한 5 를 통과해 버린다.
    await expect(readLimitedBody(requestOf(["한글"]), 5)).resolves.toBeNull();
  });
});

describe("readLimitedBytes", () => {
  it("응답 본문을 바이트로 돌려준다", async () => {
    const bytes = await readLimitedBytes(new Response(streamOf(["abc"])), 100);

    expect(bytes && new TextDecoder().decode(bytes)).toBe("abc");
  });

  it("상한을 넘으면 null 이다", async () => {
    await expect(readLimitedBytes(new Response(streamOf(["abcdef"])), 3)).resolves.toBeNull();
  });

  it("본문이 없으면 빈 바이트다", async () => {
    await expect(readLimitedBytes(new Response(null), 100)).resolves.toEqual(new Uint8Array());
  });
});
