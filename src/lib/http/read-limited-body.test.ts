import { describe, expect, it } from "vitest";

import { readLimitedBody } from "@/lib/http/read-limited-body";

const streamed = (chunks: string[]) =>
  new Request("https://example.test", {
    method: "POST",
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
    // @ts-expect-error 스트림 본문을 보내려면 undici 가 이 옵션을 요구한다.
    duplex: "half",
  });

describe("readLimitedBody", () => {
  it("상한 안의 본문을 그대로 돌려준다", async () => {
    await expect(readLimitedBody(streamed(['{"a":', "1}"]), 100)).resolves.toBe('{"a":1}');
  });

  it("상한을 넘으면 null 을 준다", async () => {
    await expect(readLimitedBody(streamed(["0123456789", "0123456789"]), 15)).resolves.toBeNull();
  });

  it("멀티바이트 문자가 청크 경계에 걸쳐도 온전히 복원한다", async () => {
    const bytes = new TextEncoder().encode("한글");
    const request = new Request("https://example.test", {
      method: "POST",
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, 4));
          controller.enqueue(bytes.slice(4));
          controller.close();
        },
      }),
      // @ts-expect-error 스트림 본문을 보내려면 undici 가 이 옵션을 요구한다.
      duplex: "half",
    });

    await expect(readLimitedBody(request, 100)).resolves.toBe("한글");
  });

  it("바이트 상한이지 문자 수 상한이 아니다", async () => {
    // "한글" 은 UTF-8 로 6바이트다. 문자 수로 세면 통과해 버린다.
    await expect(readLimitedBody(streamed(["한글"]), 5)).resolves.toBeNull();
  });

  it("본문 스트림이 없으면 text() 로 읽고 같은 상한을 적용한다", async () => {
    const small = new Request("https://example.test", { method: "POST", body: "ok" });
    Object.defineProperty(small, "body", { value: null });
    await expect(readLimitedBody(small, 100)).resolves.toBe("ok");

    const large = new Request("https://example.test", { method: "POST", body: "0123456789" });
    Object.defineProperty(large, "body", { value: null });
    await expect(readLimitedBody(large, 5)).resolves.toBeNull();
  });
});
