import { expect, test } from "@playwright/test";

const VISUAL_ROUTES = [
  { name: "landing", path: "/" },
  { name: "photo-work", path: "/photo" },
  { name: "photo-albums", path: "/photo/albums" },
  { name: "music-works", path: "/music" },
  { name: "dev-projects", path: "/dev/projects" },
  { name: "contact", path: "/contact" },
] as const;

test.describe("핵심 공개 화면 시각 회귀", () => {
  for (const route of VISUAL_ROUTES) {
    test(`${route.name} 레이아웃`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route.path);
      await page.locator("main").waitFor({ state: "visible" });
      await page.locator("img").evaluateAll((images) =>
        Promise.all(
          images.map((element) => {
            const image = element as HTMLImageElement;
            return image.complete ? Promise.resolve() : image.decode().catch(() => undefined);
          }),
        ),
      );

      await expect(page).toHaveScreenshot(`${route.name}-${testInfo.project.name}.png`, {
        fullPage: true,
      });
    });
  }
});
