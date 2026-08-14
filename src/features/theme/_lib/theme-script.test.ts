// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { THEME_INIT_SCRIPT } from "@/features/theme/_lib/theme-script";

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";

const runThemeScript = (storage: Storage | Pick<Storage, "getItem"> = localStorage) => {
  new Function("localStorage", "document", "location", THEME_INIT_SCRIPT)(
    storage,
    document,
    window.location,
  );
};

describe("THEME_INIT_SCRIPT", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.section;
    document.querySelector('meta[name="theme-color"]')?.remove();
    window.history.replaceState(null, "", "/");
  });

  it("기존 테마 값을 v1 키로 이전하고 첫 페인트 전에 적용한다", () => {
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");

    runThemeScript();

    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe("dark");
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("v1 값이 있으면 기존 키보다 우선한다", () => {
    localStorage.setItem(STORAGE_KEYS.THEME, "light");
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");

    runThemeScript();

    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe("light");
  });

  it("현재 경로와 테마 배경에 맞는 모바일 브라우저 색을 첫 페인트 전에 적용한다", () => {
    localStorage.setItem(STORAGE_KEYS.THEME, "dark");
    window.history.replaceState(null, "", "/music");

    runThemeScript();

    expect(document.documentElement.dataset.section).toBe("music");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#000000",
    );
  });

  it("localStorage를 읽을 수 없어도 기본 테마의 배경색을 적용한다", () => {
    window.history.replaceState(null, "", "/dev/projects");

    runThemeScript({
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });

    expect(document.documentElement.dataset.section).toBe("dev");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#ffffff",
    );
  });
});
