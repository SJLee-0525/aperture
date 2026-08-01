import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BROWSER_THEME_COLORS, browserThemeColor } from "@/features/theme/_lib/browser-theme-color";

const GLOBALS_CSS = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");

describe("browserThemeColor", () => {
  it("주소창 팔레트가 CSS 배경 팔레트와 일치한다", () => {
    expect(GLOBALS_CSS).toContain(`--bg: ${BROWSER_THEME_COLORS.light};`);
    const darkBlock = GLOBALS_CSS.slice(GLOBALS_CSS.indexOf('[data-theme="dark"]'));
    expect(darkBlock).toContain(`--bg: ${BROWSER_THEME_COLORS.dark};`);
  });

  it("요청한 테마의 배경색을 반환한다", () => {
    expect(browserThemeColor("dark")).toBe("#000000");
  });
});
