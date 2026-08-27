// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCursorLoadingRegistry } from "@/features/custom-cursor/_lib/cursor-loading-registry";

describe("createCursorLoadingRegistry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("짧게 끝나는 요청에는 표시를 켜지 않는다", () => {
    const setLoading = vi.fn();
    const registry = createCursorLoadingRegistry(setLoading);

    registry.update("route", true);
    vi.advanceTimersByTime(100);
    registry.update("route", false);
    vi.advanceTimersByTime(1000);

    expect(setLoading).not.toHaveBeenCalled();
  });

  it("지연 시간을 넘기면 표시를 켠다", () => {
    const setLoading = vi.fn();
    const registry = createCursorLoadingRegistry(setLoading);

    registry.update("route", true);
    vi.advanceTimersByTime(200);

    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it("요청이 하나라도 남으면 끄지 않는다", () => {
    const setLoading = vi.fn();
    const registry = createCursorLoadingRegistry(setLoading);

    registry.update("a", true);
    registry.update("b", true);
    vi.advanceTimersByTime(200);
    setLoading.mockClear();
    registry.update("a", false);

    expect(setLoading).not.toHaveBeenCalled();
  });

  it("마지막 요청이 해제되면 끈다", () => {
    const setLoading = vi.fn();
    const registry = createCursorLoadingRegistry(setLoading);

    registry.update("a", true);
    vi.advanceTimersByTime(200);
    registry.update("a", false);

    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it("해제 신호를 놓쳐도 안전 시각에 끈다", () => {
    const setLoading = vi.fn();
    const registry = createCursorLoadingRegistry(setLoading);

    registry.update("a", true);
    vi.advanceTimersByTime(200);
    setLoading.mockClear();
    vi.advanceTimersByTime(10_000);

    expect(setLoading).toHaveBeenCalledWith(false);
  });

  it("정리하면 남은 타이머가 표시를 바꾸지 않는다", () => {
    const setLoading = vi.fn();
    const registry = createCursorLoadingRegistry(setLoading);

    registry.update("a", true);
    registry.dispose();
    vi.advanceTimersByTime(10_000);

    expect(setLoading).not.toHaveBeenCalled();
  });
});
