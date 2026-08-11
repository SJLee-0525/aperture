import { expect, test } from "@playwright/test";

import { photoAssertions } from "../utils/assertions/photo.assertions";
import { commonAssertions } from "../utils/assertions/common.assertions";

test.describe("Photo", () => {
  test("모바일 상세 모달의 스켈레톤과 실제 이미지 영역 높이가 같다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "모바일 브라우저 컨텍스트에서만 검증");
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

    await page.goto("/ko/photo");
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
    await page.goto("/ko/photo");
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
    await page.goto("/ko/photo");
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
    await page.goto("/ko/photo");
    await photoAssertions.filterPhotos(page);
    await page.goto("/ko/photo");
    await photoAssertions.openPhoto(page);
  });

  test("앨범 카드를 클릭해 상세로 이동한다", async ({ page }) => {
    await page.goto("/ko/photo/albums");
    await photoAssertions.openAlbum(page);
  });

  test("지도 위치를 클릭해 사진 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/ko/photo/map");
    await photoAssertions.openMapPhoto(page);
  });

  test("직접 진입한 사진 모달을 닫아도 사진 페이지에 머문다", async ({ page }) => {
    await page.goto("/ko/photo?photo=p01");
    await commonAssertions.dialogOpened(page, "새벽의 항구");

    await commonAssertions.closeDialog(page);

    await expect(page).toHaveURL(/\/ko\/photo$/);
  });

  test("태그 칩 선택이 URL에 반영되고 새로고침·뒤로가기가 동작한다", async ({ page }) => {
    await page.goto("/ko/photo");
    const count = page.locator("main").getByText(/\d+ photos/);
    const totalText = await count.textContent();

    await page.getByRole("button", { name: "야경", exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/photo\?tag=night$/);
    await expect(count).not.toHaveText(totalText!);
    const filteredText = await count.textContent();

    // 새로고침해도 URL의 필터가 그대로 복원된다.
    await page.reload();
    await expect(page).toHaveURL(/\?tag=night$/);
    await expect(count).toHaveText(filteredText!);

    // 뒤로가기는 태그 선택 전(push 이전) 상태로 되돌린다.
    await page.goBack();
    await expect(page).toHaveURL(/\/ko\/photo$/);
    await expect(count).toHaveText(totalText!);
  });

  test("복합 필터 딥링크를 복원하고 불량 태그는 무시한다", async ({ page }) => {
    await page.goto("/ko/photo");
    const count = page.locator("main").getByText(/\d+ photos/);
    const totalText = await count.textContent();

    await page.goto("/ko/photo?tag=night&focalMin=24&focalMax=70");
    await expect(count).not.toHaveText(totalText!);
    await page.getByRole("button", { name: "필터" }).click();
    await expect(page.getByText("24mm")).toBeVisible();
    await expect(page.getByText("70mm")).toBeVisible();

    // 공개 사전에 없는 태그는 기본값으로 무시된다 — 전체가 표시된다.
    await page.goto("/ko/photo?tag=zzz");
    await expect(count).toHaveText(totalText!);
  });

  test("열린 사진이 필터 결과에서 빠져도 모달은 유지된다", async ({ page }) => {
    // p01(야경·도쿄)은 street 태그가 아니지만, 상세 열람과 배경 필터는 독립이다.
    await page.goto("/ko/photo?tag=street&photo=p01");
    await commonAssertions.dialogOpened(page, "새벽의 항구");
    await expect(page).toHaveURL(/tag=street/);

    await commonAssertions.closeDialog(page);
    // 모달을 닫아도 필터는 남는다.
    await expect(page).toHaveURL(/\/ko\/photo\?tag=street$/);
  });

  test("슬라이더 키보드 조작은 replace 커밋이라 히스토리를 늘리지 않는다", async ({ page }) => {
    await page.goto("/ko/photo");
    await page.getByRole("button", { name: "필터" }).click();
    const historyLength = await page.evaluate(() => window.history.length);

    const minSlider = page.getByLabel("min mm");
    await minSlider.focus();
    await page.keyboard.press("ArrowRight");

    await expect(page).toHaveURL(/\?focalMin=17$/);
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
  });
});
