// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { THEME_INIT_SCRIPT } from "@/features/theme/_lib/theme-script";

import { sectionFromPath } from "@/constants/sections";
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

  // 공개 URL 은 전부 로케일 프리픽스를 달고 온다. 프리픽스를 벗기지 않으면 어떤 경로도
  // 매칭되지 않아 첫 페인트가 기본 섹션 색으로 그려지고 hydration 후 액센트가 튄다.
  it.each([
    ["/ko/photo", "photo"],
    ["/ko/music", "music"],
    ["/en/music/career", "music"],
    ["/en/dev/projects", "dev"],
    ["/ko/contact", "contact"],
    ["/ko/privacy", "legal"],
    ["/ko", "home"],
    ["/en", "home"],
  ])("로케일 프리픽스가 붙은 %s 를 %s 섹션으로 판정한다", (pathname, expected) => {
    window.history.replaceState(null, "", pathname);

    runThemeScript();

    expect(document.documentElement.dataset.section).toBe(expected);
    // 런타임 판정(sectionFromPath)과 인라인 스크립트가 갈리면 첫 페인트와 hydration 이 어긋난다.
    expect(document.documentElement.dataset.section).toBe(sectionFromPath(pathname));
  });
});
