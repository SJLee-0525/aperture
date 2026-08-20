// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordRevalidateFailure: vi.fn(),
  clearRevalidateFailure: vi.fn(),
  readRevalidateFailure: vi.fn<() => unknown>(() => null),
  revalidatePublicPages: vi.fn<(...args: unknown[]) => Promise<void>>(async () => undefined),
  getAdminAccessToken: vi.fn(async () => "token"),
}));

vi.mock("@/lib/cache/revalidate-failure-store", () => ({
  recordRevalidateFailure: mocks.recordRevalidateFailure,
  clearRevalidateFailure: mocks.clearRevalidateFailure,
  readRevalidateFailure: mocks.readRevalidateFailure,
}));
vi.mock("@/lib/cache/revalidate-public", () => ({
  revalidatePublicPages: mocks.revalidatePublicPages,
}));
vi.mock("@/lib/supabase/auth", () => ({ getAdminAccessToken: mocks.getAdminAccessToken }));

/**
 * 모듈 전역 상태(대기·진행 중 묶음)를 테스트마다 새로 만든다.
 * 한 테스트가 남긴 pending 이 다음 테스트로 새면 판정이 뒤섞인다.
 */
const loadModule = async () => {
  vi.resetModules();
  return import("@/lib/cache/request-revalidate");
};

describe("재검증 요청 수명", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.readRevalidateFailure.mockReturnValue(null);
    mocks.revalidatePublicPages.mockResolvedValue(undefined);
    mocks.getAdminAccessToken.mockResolvedValue("token");
  });

  afterEach(() => vi.useRealTimers());

  it("debounce 대기 중에 떠나면 먼저 기록하고 요청을 바로 보낸다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");

    flushPendingRevalidateToFailureStore();

    // 기록이 먼저다. 보내고 실패했을 때만 남기면 페이지가 죽는 순간 흔적이 사라진다.
    expect(mocks.recordRevalidateFailure).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["db:photos"] }),
    );
    // 발송은 토큰 조회를 거치므로 마이크로태스크 뒤에 일어난다.
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);
  });

  it("성공하면 그 기록을 지운다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");
    mocks.readRevalidateFailure.mockReturnValue({ tags: ["db:photos"], paths: [] });

    flushPendingRevalidateToFailureStore();
    await vi.runAllTimersAsync();

    expect(mocks.clearRevalidateFailure).toHaveBeenCalled();
  });

  it("다른 실패가 함께 남아 있으면 기록을 지우지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");
    // 이번 성공이 덮지 못하는 대상이 섞여 있다.
    mocks.readRevalidateFailure.mockReturnValue({ tags: ["db:photos", "db:albums"], paths: [] });

    flushPendingRevalidateToFailureStore();
    await vi.runAllTimersAsync();

    expect(mocks.clearRevalidateFailure).not.toHaveBeenCalled();
  });

  it("뒤로 가기 캐시로 들어가는 이동은 기록하지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    requestPublicRevalidate("db:photos");

    flushPendingRevalidateToFailureStore({ persisted: true });

    expect(mocks.recordRevalidateFailure).not.toHaveBeenCalled();
    // 대기분은 그대로 나간다. 페이지가 살아 있으므로 결과도 받는다.
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);
  });

  it("진행 중인 요청을 취소하지 않고 기록만 남긴다", async () => {
    const { flushPendingRevalidateToFailureStore, requestPublicRevalidate } = await loadModule();
    let settle: () => void = () => undefined;
    mocks.revalidatePublicPages.mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );
    requestPublicRevalidate("db:albums");
    await vi.advanceTimersByTimeAsync(300);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);

    flushPendingRevalidateToFailureStore();
    expect(mocks.recordRevalidateFailure).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["db:albums"] }),
    );

    // 페이지가 살아남으면 그 요청이 끝나고 기록도 정리된다.
    mocks.readRevalidateFailure.mockReturnValue({ tags: ["db:albums"], paths: [] });
    settle();
    await vi.runAllTimersAsync();
    expect(mocks.clearRevalidateFailure).toHaveBeenCalled();
  });

  it("남은 대상이 없으면 아무것도 하지 않는다", async () => {
    const { flushPendingRevalidateToFailureStore } = await loadModule();

    flushPendingRevalidateToFailureStore();

    expect(mocks.recordRevalidateFailure).not.toHaveBeenCalled();
    expect(mocks.revalidatePublicPages).not.toHaveBeenCalled();
  });

  it("요청이 실패하면 사유를 담아 기록한다", async () => {
    const { requestPublicPathRevalidate } = await loadModule();
    mocks.revalidatePublicPages.mockRejectedValue(new Error("네트워크"));

    requestPublicPathRevalidate("/ko/photo");
    await vi.runAllTimersAsync();

    expect(mocks.recordRevalidateFailure).toHaveBeenCalledWith(
      expect.objectContaining({ paths: ["/ko/photo"], reason: "네트워크" }),
    );
  });
});
