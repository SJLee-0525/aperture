// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useEscapeKey } from "@/hooks/use-escape-key";

afterEach(cleanup);

const pressEscape = () =>
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

describe("useEscapeKey", () => {
  it("활성 상태에서 Escape 를 받는다", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    pressEscape();

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("비활성 상태에서는 반응하지 않는다", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(false, onEscape));

    pressEscape();

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("Escape 가 아닌 키는 넘긴다", () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(true, onEscape));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onEscape).not.toHaveBeenCalled();
  });

  it("겹친 오버레이 중 최상위만 닫힌다", () => {
    const closeBelow = vi.fn();
    const closeAbove = vi.fn();
    renderHook(() => useEscapeKey(true, closeBelow));
    const above = renderHook(() => useEscapeKey(true, closeAbove));

    pressEscape();

    expect(closeAbove).toHaveBeenCalledTimes(1);
    expect(closeBelow).not.toHaveBeenCalled();

    above.unmount();
    pressEscape();

    expect(closeBelow).toHaveBeenCalledTimes(1);
  });

  it("뒤에 등록된 리스너를 끊는다", () => {
    const later = vi.fn();
    renderHook(() => useEscapeKey(true, vi.fn()));
    // stopImmediatePropagation 은 자신보다 뒤에 등록된 리스너만 막는다.
    // 오버레이가 열린 뒤 붙는 리스너가 그 대상이다.
    document.addEventListener("keydown", later);

    pressEscape();
    document.removeEventListener("keydown", later);

    expect(later).not.toHaveBeenCalled();
  });

  it("리렌더 사이에 바뀐 콜백을 쓴다", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onEscape }) => useEscapeKey(true, onEscape), {
      initialProps: { onEscape: first },
    });

    rerender({ onEscape: second });
    pressEscape();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
