import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BROWSER_THEME_COLORS, browserThemeColor } from "@/features/theme/_lib/browser-theme-color";

const GLOBALS_CSS = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");

describe("browserThemeColor", () => {
  it("섹션 주소창 팔레트가 CSS 액센트 팔레트와 일치한다", () => {
    for (const [section, color] of Object.entries(BROWSER_THEME_COLORS.light)) {
      const variable = section === "home" ? "--bg" : `--accent-${section}`;
      expect(GLOBALS_CSS).toContain(`${variable}: ${color};`);
    }
    for (const [section, color] of Object.entries(BROWSER_THEME_COLORS.dark)) {
      const variable = section === "home" ? "--bg" : `--accent-${section}`;
      const darkBlock = GLOBALS_CSS.slice(GLOBALS_CSS.indexOf('[data-theme="dark"]'));
      expect(darkBlock).toContain(`${variable}: ${color};`);
    }
  });

  it("요청한 테마와 섹션의 색을 반환한다", () => {
    expect(browserThemeColor("music", "dark")).toBe("#ff5b60");
  });
});
