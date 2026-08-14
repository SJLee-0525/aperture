// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CLOSE_GRACE_MS, useHoverGrace } from "@/features/dev-blog/_hooks/use-hover-grace";

describe("useHoverGrace", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("들어오면 바로 열린다", () => {
    const { result } = renderHook(() => useHoverGrace());

    act(() => result.current.onEnter());
    expect(result.current.open).toBe(true);
  });

  it("나가면 유예 시간이 지난 뒤에 닫힌다", () => {
    const { result } = renderHook(() => useHoverGrace());

    act(() => result.current.onEnter());
    act(() => result.current.onLeave());
    expect(result.current.open).toBe(true);

    act(() => vi.advanceTimersByTime(CLOSE_GRACE_MS));
    expect(result.current.open).toBe(false);
  });

  it("유예 중에 다시 들어오면 닫히지 않는다", () => {
    const { result } = renderHook(() => useHoverGrace());

    act(() => result.current.onEnter());
    act(() => result.current.onLeave());
    act(() => vi.advanceTimersByTime(CLOSE_GRACE_MS - 50));
    act(() => result.current.onEnter());
    act(() => vi.advanceTimersByTime(CLOSE_GRACE_MS));

    // 인디케이터와 패널 사이를 지나는 동안 깜빡이지 않아야 한다.
    expect(result.current.open).toBe(true);
  });

  it("즉시 닫기는 예약된 닫기를 취소하고 바로 닫는다", () => {
    const { result } = renderHook(() => useHoverGrace());

    act(() => result.current.onEnter());
    act(() => result.current.close());
    expect(result.current.open).toBe(false);

    act(() => vi.advanceTimersByTime(CLOSE_GRACE_MS));
    expect(result.current.open).toBe(false);
  });
});
