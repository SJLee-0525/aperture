// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordRevalidateFailure: vi.fn(),
  revalidatePublicPages: vi.fn(),
  getAdminAccessToken: vi.fn(),
}));

vi.mock("@/lib/cache/revalidate-failure-store", () => ({
  recordRevalidateFailure: mocks.recordRevalidateFailure,
}));
vi.mock("@/lib/cache/revalidate-public", () => ({
  revalidatePublicPages: mocks.revalidatePublicPages,
}));
vi.mock("@/lib/supabase/auth", () => ({ getAdminAccessToken: mocks.getAdminAccessToken }));

import {
  flushPendingRevalidateToFailureStore,
  requestPublicPathRevalidate,
  requestPublicRevalidate,
} from "@/lib/cache/request-revalidate";

describe("flushPendingRevalidateToFailureStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getAdminAccessToken.mockResolvedValue("token");
    mocks.revalidatePublicPages.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // 남은 debounce 가 다음 테스트로 새지 않게 비운다.
    flushPendingRevalidateToFailureStore();
    mocks.recordRevalidateFailure.mockClear();
    vi.useRealTimers();
  });

  it("debounce 대기 중에 떠나면 대상과 사유를 실패 기록으로 남긴다", () => {
    requestPublicRevalidate("db:photos");
    requestPublicPathRevalidate("/ko/photo");

    flushPendingRevalidateToFailureStore();

    expect(mocks.recordRevalidateFailure).toHaveBeenCalledWith({
      tags: ["db:photos"],
      paths: ["/ko/photo"],
      reason: expect.stringContaining("페이지를 떠나"),
    });
    // 기록으로 넘겼으므로 예약돼 있던 요청은 나가지 않는다.
    vi.advanceTimersByTime(1_000);
    expect(mocks.revalidatePublicPages).not.toHaveBeenCalled();
  });

  it("요청이 진행 중일 때 떠나도 그 대상을 남긴다", async () => {
    // 응답이 오지 않는 요청 = pending 은 이미 비었고 결과를 받을 곳이 없는 상태.
    mocks.revalidatePublicPages.mockReturnValue(new Promise(() => undefined));
    requestPublicRevalidate("db:albums");
    await vi.advanceTimersByTimeAsync(300);
    expect(mocks.revalidatePublicPages).toHaveBeenCalledTimes(1);

    flushPendingRevalidateToFailureStore();

    expect(mocks.recordRevalidateFailure).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["db:albums"] }),
    );
  });

  it("요청이 성공하면 떠나도 아무것도 남기지 않는다", async () => {
    requestPublicRevalidate("db:photos");
    await vi.advanceTimersByTimeAsync(300);

    flushPendingRevalidateToFailureStore();

    expect(mocks.recordRevalidateFailure).not.toHaveBeenCalled();
  });

  it("남은 대상이 없으면 기록하지 않는다", () => {
    flushPendingRevalidateToFailureStore();

    expect(mocks.recordRevalidateFailure).not.toHaveBeenCalled();
  });
});
