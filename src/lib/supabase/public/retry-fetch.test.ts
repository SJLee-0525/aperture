import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "@/lib/supabase/public/retry-fetch";

/**
 * 정적 생성은 읽기 한 번이 실패하면 빌드 전체를 중단한다. 어떤 응답을 다시 보내고
 * 어떤 응답을 그대로 돌려주는지가 배포 성패를 가른다.
 */
const response = (status: number) => {
  const cancel = vi.fn().mockResolvedValue(undefined);
  return { status, ok: status < 400, body: { cancel } } as unknown as Response;
};

/** 재시도 간격은 400ms 부터 시도마다 배수로 늘어난다. 두 번의 대기를 모두 흘린다. */
const runBackoff = async () => {
  await vi.advanceTimersByTimeAsync(400);
  await vi.advanceTimersByTimeAsync(800);
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchWithRetry", () => {
  it("5xx 는 다시 보내고 성공하면 그 응답을 돌려준다", async () => {
    const ok = response(200);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.test/rows");
    await runBackoff();

    await expect(promise).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("429 는 다시 보내지 않는다", async () => {
    // Supabase 의 요청 제한은 곧바로 풀리지 않는다. 같은 요청을 즉시 반복하면 상황만 나빠진다.
    const throttled = response(429);
    const fetchMock = vi.fn().mockResolvedValue(throttled);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithRetry("https://example.test/rows")).resolves.toBe(throttled);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("세 번째 시도의 5xx 응답은 그대로 돌려준다", async () => {
    const failed = response(500);
    const fetchMock = vi.fn().mockResolvedValue(failed);
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.test/rows");
    await runBackoff();

    await expect(promise).resolves.toBe(failed);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("재시도 전에 읽지 않은 본문을 닫는다", async () => {
    // 본문을 남기면 연결이 반환되지 않아 다음 시도가 소켓을 새로 연다.
    const first = response(500);
    const fetchMock = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(response(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.test/rows");
    await runBackoff();
    await promise;

    expect(first.body?.cancel).toHaveBeenCalledTimes(1);
  });

  it("네트워크 오류는 다시 보내고 마지막 오류를 그대로 던진다", async () => {
    const last = new Error("ETIMEDOUT 3");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ETIMEDOUT 1"))
      .mockRejectedValueOnce(new Error("ETIMEDOUT 2"))
      .mockRejectedValueOnce(last);
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.test/rows");
    const assertion = expect(promise).rejects.toBe(last);
    await runBackoff();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("이미 중단된 요청은 재시도하지 않는다", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockRejectedValue(new Error("aborted"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithRetry("https://example.test/rows", { signal: controller.signal }),
    ).rejects.toThrow("aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("대기 중에 중단되면 다시 보내지 않고 중단 사유를 던진다", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(response(503));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.test/rows", { signal: controller.signal });
    // 아래에서 await 하기 전까지 거부가 미처리로 잡히지 않게 핸들러를 먼저 붙인다.
    promise.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(1);
    const reason = new Error("호출자가 취소했다");
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(400);

    await expect(promise).rejects.toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
