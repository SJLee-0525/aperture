// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "@/constants/storage-keys";
import { THEME_INIT_SCRIPT } from "@/features/theme/_lib/theme-script";

const runThemeScript = () => {
  new Function("localStorage", "document", THEME_INIT_SCRIPT)(localStorage, document);
};

describe("THEME_INIT_SCRIPT", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
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
});
