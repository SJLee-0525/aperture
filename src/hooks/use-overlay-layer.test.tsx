// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useOverlayLayer } from "@/hooks/use-overlay-layer";

afterEach(cleanup);

describe("useOverlayLayer", () => {
  it("가장 나중에 열린 오버레이만 최상위가 된다", () => {
    const modal = renderHook(() => useOverlayLayer(true));
    expect(modal.result.current).toBe(true);

    const chat = renderHook(() => useOverlayLayer(true));
    expect(modal.result.current).toBe(false);
    expect(chat.result.current).toBe(true);

    chat.unmount();
    expect(modal.result.current).toBe(true);
  });

  it("아래 오버레이가 먼저 해제되어도 최상위 항목을 유지한다", () => {
    const modal = renderHook(() => useOverlayLayer(true));
    const chat = renderHook(() => useOverlayLayer(true));

    modal.unmount();
    expect(chat.result.current).toBe(true);
  });
});
