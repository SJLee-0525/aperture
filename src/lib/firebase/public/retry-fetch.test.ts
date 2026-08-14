import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "@/lib/firebase/public/retry-fetch";

const originalFetch = globalThis.fetch;

/** 재시도 대기를 실제로 기다리지 않도록 타이머를 즉시 흘려 보낸다. */
const runAllTimers = async (promise: Promise<Response>): Promise<Response> => {
  // 타이머를 흘리는 동안 거부되면 핸들러가 없어 unhandled rejection 으로 잡힌다.
  promise.catch(() => undefined);
  await vi.runAllTimersAsync();
  return promise;
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe("fetchWithRetry", () => {
  it("연결 실패 뒤 성공하면 마지막 응답을 돌려준다", async () => {
    const ok = new Response("[]", { status: 200 });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok);
    globalThis.fetch = fetchMock;

    await expect(runAllTimers(fetchWithRetry("https://example.test"))).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("5xx 는 다시 시도하고 4xx 는 그대로 돌려준다", async () => {
    const ok = new Response("[]", { status: 200 });
    const retried = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok);
    globalThis.fetch = retried;
    await expect(runAllTimers(fetchWithRetry("https://example.test"))).resolves.toBe(ok);
    expect(retried).toHaveBeenCalledTimes(2);

    const forbidden = new Response("", { status: 403 });
    const notRetried = vi.fn<typeof fetch>().mockResolvedValue(forbidden);
    globalThis.fetch = notRetried;
    await expect(runAllTimers(fetchWithRetry("https://example.test"))).resolves.toBe(forbidden);
    expect(notRetried).toHaveBeenCalledTimes(1);
  });

  it("429 는 한도 소진이라 다시 시도하지 않는다", async () => {
    const exhausted = new Response("", { status: 429 });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(exhausted);
    globalThis.fetch = fetchMock;

    await expect(runAllTimers(fetchWithRetry("https://example.test"))).resolves.toBe(exhausted);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("대기 중에 중단되면 남은 시간을 기다리지 않고 끝낸다", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    globalThis.fetch = fetchMock;

    const pending = fetchWithRetry("https://example.test", { signal: controller.signal });
    pending.catch(() => undefined);
    // 첫 시도가 503 을 받고 대기에 들어간 뒤 중단한다.
    await vi.advanceTimersByTimeAsync(0);
    controller.abort(new Error("취소"));
    await vi.runAllTimersAsync();

    await expect(pending).rejects.toThrow("취소");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("계속 실패하면 3번 시도한 뒤 마지막 오류를 던진다", async () => {
    const failure = new TypeError("fetch failed");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(failure);
    globalThis.fetch = fetchMock;

    await expect(runAllTimers(fetchWithRetry("https://example.test"))).rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("중단된 요청은 다시 시도하지 않는다", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("aborted"));
    globalThis.fetch = fetchMock;

    await expect(
      runAllTimers(fetchWithRetry("https://example.test", { signal: controller.signal })),
    ).rejects.toThrow("aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
