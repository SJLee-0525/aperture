import { expect, test } from "@playwright/test";

import { photoAssertions } from "../utils/assertions/photo.assertions";
import { commonAssertions } from "../utils/assertions/common.assertions";

test.describe("Photo", () => {
  test("모바일 상세 모달의 스켈레톤과 실제 이미지 영역 높이가 같다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/photos/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.route("**/_next/image?*", async (route) => {
      const width = Number(new URL(route.request().url()).searchParams.get("w"));
      if (width >= 640) await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.continue();
    });

    await page.goto("/photo");
    await page.locator("[data-photo-index='0'] a").click();

    const pendingArea = page.locator('[data-photo-modal-image-area="pending"]');
    await expect(pendingArea).toBeVisible();
    const pendingHeight = await pendingArea.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    const readyArea = page.locator('[data-photo-modal-image-area="ready"]');
    await expect(readyArea).toBeAttached();
    const readyHeight = await readyArea.evaluate(
      (element) => element.getBoundingClientRect().height,
    );

    expect(Math.abs(pendingHeight - readyHeight)).toBeLessThanOrEqual(1);
  });

  test("첫 모달 로딩에서 body 스크롤 잠금이 중간에 풀리지 않는다", async ({ page }) => {
    await page.route("**/api/photos/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.goto("/photo");
    await page.evaluate(() => {
      const states: string[] = [];
      new MutationObserver(() => states.push(document.body.style.overflow)).observe(document.body, {
        attributes: true,
        attributeFilter: ["style"],
      });
      Object.assign(window, { __scrollLockStates: states });
    });

    await page.locator("[data-photo-index='0'] a").click();
    await expect(page.locator('[data-photo-modal-image-area="ready"]')).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    const states = await page.evaluate(
      () => (window as typeof window & { __scrollLockStates: string[] }).__scrollLockStates,
    );
    const firstLocked = states.indexOf("hidden");
    expect(firstLocked).toBeGreaterThanOrEqual(0);
    expect(states.slice(firstLocked)).toEqual(states.slice(firstLocked).map(() => "hidden"));
  });

  test("로딩 프레임 전환 중 페이지 배경이 비치지 않는다", async ({ page }) => {
    await page.route("**/_next/image?*", async (route) => {
      const width = Number(new URL(route.request().url()).searchParams.get("w"));
      if (width >= 640) await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.goto("/photo");
    await page.locator("[data-photo-index='0'] a").click();

    const pending = page.locator("[data-photo-pending-frame]");
    await expect(pending).toBeVisible();
    await expect(pending).toHaveCount(0);

    const opacity = await page.locator("[data-photo-modal-root]").evaluate((root) => ({
      root: getComputedStyle(root).opacity,
      frame: getComputedStyle(root.querySelector("[data-photo-modal-frame]")!).opacity,
    }));
    expect(opacity).toEqual({ root: "1", frame: "1" });
  });

  test("사진을 검색하고 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/photo");
    await photoAssertions.filterPhotos(page);
    await page.goto("/photo");
    await photoAssertions.openPhoto(page);
  });

  test("앨범 카드를 클릭해 상세로 이동한다", async ({ page }) => {
    await page.goto("/photo/albums");
    await photoAssertions.openAlbum(page);
  });

  test("지도 위치를 클릭해 사진 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/photo/map");
    await photoAssertions.openMapPhoto(page);
  });

  test("직접 진입한 사진 모달을 닫아도 사진 페이지에 머문다", async ({ page }) => {
    await page.goto("/photo?photo=p01");
    await commonAssertions.dialogOpened(page, "새벽의 항구");

    await commonAssertions.closeDialog(page);

    await expect(page).toHaveURL(/\/photo$/);
  });
});
