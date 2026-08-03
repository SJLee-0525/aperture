// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isScrollLockFixingBody, useScrollLock } from "@/hooks/use-scroll-lock";

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

  it("키보드 대응 오버레이는 body 위치를 바꾸지 않고 스크롤만 잠근다", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    const { rerender } = renderHook(
      ({ locked }) => useScrollLock(locked, { fixBodyOnMobile: false }),
      {
        initialProps: { locked: true },
      },
    );

    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");

    rerender({ locked: false });

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("sticky 헤더 오버레이(lockRootOnMobile:false)는 root overflow 를 건드리지 않는다", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    const { rerender } = renderHook(
      ({ locked }) => useScrollLock(locked, { fixBodyOnMobile: false, lockRootOnMobile: false }),
      { initialProps: { locked: true } },
    );

    // root(html) overflow 를 잠그면 body overflow 의 viewport 승격이 끊겨
    // sticky 헤더가 문서 최상단으로 밀려난다 — body overflow 승격만으로 잠근다.
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("");

    rerender({ locked: false });

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("isScrollLockFixingBody는 body fixed 잠금 동안에만 true다", () => {
    Object.defineProperties(window, {
      innerWidth: { configurable: true, value: 390 },
      scrollY: { configurable: true, value: 123 },
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

    expect(isScrollLockFixingBody()).toBe(false);

    const { rerender } = renderHook(({ locked }) => useScrollLock(locked), {
      initialProps: { locked: true },
    });
    expect(isScrollLockFixingBody()).toBe(true);

    rerender({ locked: false });
    expect(isScrollLockFixingBody()).toBe(false);
  });

  it("isScrollLockFixingBody는 fixBodyOnMobile:false 잠금에서는 false다", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    const { rerender } = renderHook(
      ({ locked }) => useScrollLock(locked, { fixBodyOnMobile: false }),
      { initialProps: { locked: true } },
    );
    expect(isScrollLockFixingBody()).toBe(false);

    rerender({ locked: false });
  });
});
