import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ACCESSIBILITY_ROUTES = [
  "/",
  "/photo",
  "/photo/albums",
  "/music",
  "/dev/projects",
  "/contact",
] as const;

const THEMES = ["light", "dark"] as const;

test.describe("핵심 공개 화면 접근성", () => {
  for (const theme of THEMES) {
    for (const route of ACCESSIBILITY_ROUTES) {
      test(`${theme} ${route}에 axe 위반이 없다`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "axe 스캔은 데스크톱 DOM에서 대표 실행");

        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(
          ([storageKey, selectedTheme]) => localStorage.setItem(storageKey, selectedTheme),
          ["ap-theme:v1", theme],
        );
        await page.goto(route);
        await page.locator("body").waitFor({ state: "visible" });
        await page.waitForFunction(() => document.documentElement.dataset.section != null);
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});
