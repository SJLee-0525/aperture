import { expect, test } from "@playwright/test";

import { settleImages } from "../utils/settle-images";

const VISUAL_ROUTES = [
  { name: "landing", path: "/ko" },
  { name: "photo-work", path: "/ko/photo" },
  { name: "photo-albums", path: "/ko/photo/albums" },
  // 앨범 상세는 공용 hero 프리미티브의 원본이라 hero 를 옮긴 뒤에도 같은 화면이어야 한다.
  { name: "photo-album-detail", path: "/ko/photo/albums/city-night" },
  // 커버 없는 앨범에서 plain 히어로의 글자색을 확인한다.
  { name: "photo-album-detail-plain", path: "/ko/photo/albums/unreleased" },
  { name: "music-works", path: "/ko/music" },
  { name: "dev-projects", path: "/ko/dev/projects" },
  // 블로그 두 지면은 기준선 png 만 있고 라우트가 빠져 있어 아무 테스트도 소비하지 않았다.
  { name: "dev-articles", path: "/ko/dev/articles" },
  { name: "dev-article-detail", path: "/ko/dev/articles/serverless-portfolio" },
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
      // 웹폰트 교체가 끝난 뒤 캡처해 폴백 폰트가 기준선에 남지 않게 한다.
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await settleImages(page);

      await expect(page).toHaveScreenshot(`${route.name}-${testInfo.project.name}.png`, {
        fullPage: true,
      });
    });
  }
});
