// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useScrollLock } from "@/hooks/use-scroll-lock";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  vi.restoreAllMocks();
});

describe("useScrollLock", () => {
  it("root와 body를 함께 고정하고 닫을 때 스타일과 스크롤 위치를 복원한다", () => {
    document.documentElement.style.overflow = "clip";
    document.body.style.overflow = "auto";
    Object.defineProperties(window, {
      innerWidth: { configurable: true, value: 390 },
      scrollX: { configurable: true, value: 7 },
      scrollY: { configurable: true, value: 123 },
    });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    const { rerender } = renderHook(({ locked }) => useScrollLock(locked), {
      initialProps: { locked: true },
    });

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-123px");

    rerender({ locked: false });

    expect(document.documentElement.style.overflow).toBe("clip");
    expect(document.body.style.overflow).toBe("auto");
    expect(document.body.style.position).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(7, 123);
  });
});
