// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RevalidateFailure } from "@/lib/cache/revalidate-failure-store";

/**
 * 실패 저장소 대역. 실제 구현처럼 대상을 합집합으로 병합하고 사유·시각을 갱신한다.
 * 상수를 돌려주는 대역으로는 "다른 실패가 끼어들었는지" 를 구분하는 계약을 검증할 수 없다.
 */
const store = vi.hoisted(() => {
  let record: RevalidateFailure | null = null;
  let clock = 0;
  return {
    read: (): RevalidateFailure | null => (record ? { ...record } : null),
    write: (failure: { tags: string[]; paths: string[]; reason: string }) => {
      clock += 1;
      record = {
        tags: [...new Set([...(record?.tags ?? []), ...failure.tags])],
        paths: [...new Set([...(record?.paths ?? []), ...failure.paths])],
        failedAt: `t${clock}`,
        reason: failure.reason,
      };
    },
    clear: () => {
      record = null;
    },
    reset: () => {
      record = null;
      clock = 0;
    },
    current: () => record,
  };
});

const mocks = vi.hoisted(() => ({
  revalidatePublicPages: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
  getAdminAccessToken: vi.fn(async () => "token"),
}));

vi.mock("@/lib/cache/revalidate-failure-store", () => ({
  recordRevalidateFailure: store.write,
  clearRevalidateFailure: store.clear,
  readRevalidateFailure: store.read,
}));
vi.mock("@/lib/cache/revalidate-public", () => ({
  revalidatePublicPages: mocks.revalidatePublicPages,
}));
vi.mock("@/lib/supabase/auth", () => ({ getAdminAccessToken: mocks.getAdminAccessToken }));

/**
 * 모듈 전역 상태(대기·진행 중 묶음, 이탈 묶음)를 테스트마다 새로 만든다.
 * 한 테스트가 남긴 상태가 다음 테스트로 새면 정산 판정이 뒤섞인다.
 */
const loadModule = async () => {
  vi.resetModules();
  return import("@/lib/cache/request-revalidate");
};

/** 응답을 테스트가 정하는 요청. `settle`·`fail` 로 끝낸다. */
const deferredRequest = () => {
  let settle: () => void = () => undefined;
  let fail: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  return { promise, settle, fail };
};

describe("재검증 요청 수명", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    store.reset();
    mocks.revalidatePublicPages.mockResolvedValue(undefined);
    mocks.getAdminAccessToken.mockResolvedValue("token");
  });

  afterEach(() => vi.useRealTimers());

  it("debounce 대기 중에 떠나면 먼저 기록하고 요청을 바로 보낸다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");

    flushPendingRevalidateToFailureStore();

    // 기록이 먼저다. 보내고 실패했을 때만 남기면 페이지가 죽는 순간 흔적이 사라진다.
    expect(store.current()?.tags).toEqual(["db:photos"]);
    // 발송은 토큰 조회를 거치므로 마이크로태스크 뒤에 일어난다.
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);
  });

  it("이탈 묶음이 전부 성공하면 그 기록을 지운다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");

    flushPendingRevalidateToFailureStore();
    await vi.runAllTimersAsync();

    expect(store.current()).toBeNull();
  });

  it.each([
    ["먼저 시작한 요청부터", 0],
    ["나중에 시작한 요청부터", 1],
  ])("묶음의 요청 두 개가 %s 끝나도 전부 성공하면 지운다", async (_label, firstToSettle) => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    const inFlightRequest = deferredRequest();
    const promotedRequest = deferredRequest();
    mocks.revalidatePublicPages
      .mockReturnValueOnce(inFlightRequest.promise)
      .mockReturnValueOnce(promotedRequest.promise);

    // 진행 중 묶음 하나를 만들고, 대기 중 묶음을 남긴 채 떠난다.
    requestPublicRevalidate("db:photos");
    await vi.advanceTimersByTimeAsync(300);
    requestPublicRevalidate("db:albums");
    flushPendingRevalidateToFailureStore();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.current()?.tags).toEqual(["db:photos", "db:albums"]);

    const order =
      firstToSettle === 0 ? [inFlightRequest, promotedRequest] : [promotedRequest, inFlightRequest];
    order[0]?.settle();
    await vi.runAllTimersAsync();
    // 하나만 끝난 시점에는 남아 있어야 한다.
    expect(store.current()).not.toBeNull();

    order[1]?.settle();
    await vi.runAllTimersAsync();
    expect(store.current()).toBeNull();
  });

  it("묶음 안에서 하나라도 실패하면 기록을 남긴다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    const inFlightRequest = deferredRequest();
    const promotedRequest = deferredRequest();
    mocks.revalidatePublicPages
      .mockReturnValueOnce(inFlightRequest.promise)
      .mockReturnValueOnce(promotedRequest.promise);

    requestPublicRevalidate("db:photos");
    await vi.advanceTimersByTimeAsync(300);
    requestPublicRevalidate("db:albums");
    flushPendingRevalidateToFailureStore();
    await vi.advanceTimersByTimeAsync(0);

    inFlightRequest.settle();
    promotedRequest.fail(new Error("네트워크"));
    await vi.runAllTimersAsync();

    expect(store.current()?.reason).toBe("네트워크");
  });

  it("이탈 뒤 다른 실패가 끼어들면 묶음이 전부 성공해도 지우지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    const request = deferredRequest();
    mocks.revalidatePublicPages.mockReturnValueOnce(request.promise);

    requestPublicRevalidate("db:photos");
    flushPendingRevalidateToFailureStore();
    await vi.advanceTimersByTimeAsync(0);

    // 다른 탭이 같은 저장소에 실제 실패를 병합했다.
    store.write({ tags: ["db:musicWorks"], paths: [], reason: "다른 탭의 실패" });

    request.settle();
    await vi.runAllTimersAsync();

    // 남의 실패까지 지우면 안 된다.
    expect(store.current()?.tags).toContain("db:musicWorks");
  });

  it("이탈 전에 이미 기록이 있었으면 지우지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    store.write({ tags: ["db:musicWorks"], paths: [], reason: "예전 실패" });

    requestPublicRevalidate("db:photos");
    flushPendingRevalidateToFailureStore();
    await vi.runAllTimersAsync();

    expect(store.current()?.tags).toContain("db:musicWorks");
  });

  it("이탈 이후 새로 생긴 요청은 그 묶음의 정산에 섞이지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    const leaving = deferredRequest();
    mocks.revalidatePublicPages.mockReturnValueOnce(leaving.promise);

    requestPublicRevalidate("db:photos");
    flushPendingRevalidateToFailureStore();
    await vi.advanceTimersByTimeAsync(0);

    // 페이지가 살아남아(bfcache 복원 등) 새 저장이 일어난다.
    requestPublicRevalidate("db:albums");
    await vi.advanceTimersByTimeAsync(300);

    leaving.settle();
    await vi.runAllTimersAsync();

    // 이탈 묶음이 끝났으므로 그 기록은 정리된다.
    expect(store.current()).toBeNull();
  });

  it("정산이 끝나면 다음 이탈이 독립적으로 동작한다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");
    flushPendingRevalidateToFailureStore();
    await vi.runAllTimersAsync();
    expect(store.current()).toBeNull();

    requestPublicRevalidate("db:albums");
    flushPendingRevalidateToFailureStore();
    expect(store.current()?.tags).toEqual(["db:albums"]);
    await vi.runAllTimersAsync();
    expect(store.current()).toBeNull();
  });

  it("뒤로 가기 캐시로 들어가는 이동은 기록하지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");

    flushPendingRevalidateToFailureStore({ persisted: true });

    expect(store.current()).toBeNull();
    // 대기분은 그대로 나간다. 페이지가 살아 있으므로 결과도 받는다.
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);
  });

  it("진행 중인 요청을 취소하지 않고 기록만 남긴다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    const request = deferredRequest();
    mocks.revalidatePublicPages.mockReturnValueOnce(request.promise);
    requestPublicRevalidate("db:albums");
    await vi.advanceTimersByTimeAsync(300);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);

    flushPendingRevalidateToFailureStore();
    expect(store.current()?.tags).toEqual(["db:albums"]);

    // 페이지가 살아남으면 그 요청이 끝나고 기록도 정리된다.
    request.settle();
    await vi.runAllTimersAsync();
    expect(store.current()).toBeNull();
  });

  it("남은 대상이 없으면 아무것도 하지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore } = await loadModule();

    flushPendingRevalidateToFailureStore();

    expect(store.current()).toBeNull();
    expect(mocks.revalidatePublicPages).not.toHaveBeenCalled();
  });

  it("요청이 실패하면 사유를 담아 기록한다", async () => {
    const { requestPublicPathRevalidate } = await loadModule();
    mocks.revalidatePublicPages.mockRejectedValue(new Error("네트워크"));

    requestPublicPathRevalidate("/ko/photo");
    await vi.runAllTimersAsync();

    expect(store.current()).toMatchObject({ paths: ["/ko/photo"], reason: "네트워크" });
  });
});
