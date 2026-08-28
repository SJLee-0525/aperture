import { expect, test } from "@playwright/test";

/**
 * 지도 높이와 하단 탭바의 브레이크포인트가 어긋나면 특정 폭에서만 지도가 탭바에 가린다.
 * 셋(탭바 노출, 헤더 높이, 지도 높이)이 같은 경계를 써야 한다.
 * (constants/breakpoints.ts 의 MOBILE_NAVIGATION_MAX_WIDTH)
 */
const WIDTHS = [758, 800, 890, 899, 900] as const;

test.describe("지도 높이 경계", () => {
  for (const width of WIDTHS) {
    test(`${width}px 에서 지도가 하단 탭바를 넘지 않는다`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "뷰포트 폭만 바꿔 한 번 확인한다");

      await page.setViewportSize({ width, height: 900 });
      await page.goto("/ko/photo/map");
      await page.waitForFunction(() => document.documentElement.dataset.section != null);

      const stage = await page.locator("main").boundingBox();
      const tabbar = await page.locator("[data-mobile-tab-bar]").boundingBox();
      expect(stage).not.toBeNull();
      if (!stage || !tabbar) return; // 경계 위에는 탭바가 없다

      expect(Math.round(stage.y + stage.height)).toBeLessThanOrEqual(Math.round(tabbar.y) + 1);
    });
  }
});
