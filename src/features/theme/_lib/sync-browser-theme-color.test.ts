// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { syncBrowserThemeColor } from "@/features/theme/_lib/browser-theme-color";

describe("syncBrowserThemeColor", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.remove();
  });

  it("meta가 없으면 만들고 명시한 테마 색을 동기화한다", () => {
    syncBrowserThemeColor("dark");

    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#000000",
    );
  });

  it("기존 meta와 문서의 현재 테마를 사용한다", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
    document.documentElement.dataset.theme = "dark";

    syncBrowserThemeColor();

    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(meta.content).toBe("#000000");
  });

  it("문서에 dark 테마가 없으면 light를 기본값으로 사용한다", () => {
    syncBrowserThemeColor();

    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#ffffff",
    );
  });
});
