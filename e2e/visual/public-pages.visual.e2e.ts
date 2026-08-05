import { expect, test } from "@playwright/test";

const VISUAL_ROUTES = [
  { name: "landing", path: "/ko" },
  { name: "photo-work", path: "/ko/photo" },
  { name: "photo-albums", path: "/ko/photo/albums" },
  { name: "music-works", path: "/ko/music" },
  { name: "dev-projects", path: "/ko/dev/projects" },
  { name: "contact", path: "/ko/contact" },
] as const;

test.describe("핵심 공개 화면 시각 회귀", () => {
  test.skip(process.platform !== "win32", "시각 기준선은 GitHub Actions Windows 환경에서 관리");
  // dev 서버는 next/font mock(연결 불가 URL)으로 폴백 폰트가 렌더돼 프로덕션 기준선과 어긋난다.
  test.skip(
    process.env.E2E_PRODUCTION !== "1",
    "시각 기준선은 프로덕션 렌더링(next start) 기준 — E2E_PRODUCTION=1 또는 --production 으로 실행",
  );

  for (const route of VISUAL_ROUTES) {
    test(`${route.name} 레이아웃`, async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route.path);
      await page.locator("main").waitFor({ state: "visible" });
      await page.locator("img").evaluateAll((images) =>
        Promise.all(
          images
            .map((element) => element as HTMLImageElement)
            .filter((image) => image.loading !== "lazy" || image.complete)
            .map((image) =>
              image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
            ),
        ),
      );

      await expect(page).toHaveScreenshot(`${route.name}-${testInfo.project.name}.png`, {
        fullPage: true,
      });
    });
  }
});
