import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * 공개 라우트 전부. 목록에서 빠진 지면은 아무도 보지 않는다. `/photo/map` 이 그래서
 * main 도 h1 도 없는 채로 남아 있었다.
 *
 * 데스크톱과 모바일 양쪽에서 돌린다. 모바일 하단 탭바처럼 데스크톱에서 display:none 인
 * 요소는 한쪽만 돌리면 대비 검사 대상에서 빠진다.
 */
const ACCESSIBILITY_ROUTES = [
  "/ko",
  "/ko/photo",
  "/ko/photo/albums",
  "/ko/photo/albums/city-night",
  "/ko/photo/map",
  "/ko/photo/about",
  "/ko/music",
  "/ko/music/about",
  "/ko/music/career",
  "/ko/music/media",
  "/ko/dev",
  "/ko/dev/career",
  "/ko/dev/projects",
  "/ko/dev/articles",
  "/ko/dev/articles/serverless-portfolio",
  "/ko/search",
  "/ko/contact",
  "/ko/privacy",
  "/ko/terms",
  "/ko/accessibility",
] as const;

const THEMES = ["light", "dark"] as const;

test.describe("핵심 공개 화면 접근성", () => {
  for (const theme of THEMES) {
    for (const route of ACCESSIBILITY_ROUTES) {
      test(`${theme} ${route}에 axe 위반이 없다`, async ({ page }) => {
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
