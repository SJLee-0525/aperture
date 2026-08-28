import { expect, test } from "@playwright/test";

import { photoAssertions } from "../utils/assertions/photo.assertions";
import { commonAssertions } from "../utils/assertions/common.assertions";
import { swipeHorizontally } from "../utils/touch-swipe";

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
      root: Number(getComputedStyle(root).opacity),
      frame: Number(getComputedStyle(root.querySelector("[data-photo-modal-frame]")!).opacity),
    }));
    // 계약은 프레임이 걷히는 순간 페이지가 비치지 않는다는 것이다. 이징의 마지막
    // 천분의 몇(0.999988)은 화면에서 구분되지 않으므로 정확히 1 을 요구하지 않는다.
    expect(opacity.root).toBeGreaterThan(0.99);
    expect(opacity.frame).toBeGreaterThan(0.99);
  });

  test.describe("모바일 좌우 스와이프", () => {
    const openFirstPhoto = async (page: Parameters<typeof swipeHorizontally>[0]) => {
      await page.goto("/ko/photo?photo=p01");
      await commonAssertions.dialogOpened(page, "새벽의 항구");
      // 이웃 슬라이드가 로드되기 전에는 넘기지 않는다. 이동 버튼은 이웃 상태를
      // 반영하지 않으므로 세 슬라이드의 로드 완료를 직접 기다린다.
      await expect
        .poll(() =>
          page
            .locator("[data-photo-modal-track] img")
            .evaluateAll(
              (nodes) =>
                nodes.length === 3 && nodes.every((node) => (node as HTMLImageElement).complete),
            ),
        )
        .toBe(true);
      // 모달은 진입 연출이 끝난 뒤부터 스와이프를 받는다. dialogOpened 는 role 만 보고
      // Playwright 는 opacity 0 도 visible 로 세므로, 그 시점은 아직 연출 중일 수 있다.
      // 시간이 아니라 연출의 종료 상태를 기다린다.
      await expect
        .poll(() =>
          page.locator("[data-photo-modal-frame]").evaluate((node) => {
            const style = getComputedStyle(node);
            const settled = new DOMMatrixReadOnly(style.transform).a === 1;
            return style.opacity === "1" && settled;
          }),
        )
        .toBe(true);
      return page.locator("[data-photo-modal-track]");
    };

    test("왼쪽으로 끌면 다음 사진으로 넘어간다", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "터치 제스처는 모바일 컨텍스트 전용");
      await openFirstPhoto(page);

      await swipeHorizontally(page, { from: 300, to: 40, y: 300 });

      await expect(page).toHaveURL(/[?&]photo=p02/);
    });

    test("끄는 동안 이웃 사진이 손가락을 따라 들어온다", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "터치 제스처는 모바일 컨텍스트 전용");
      const track = await openFirstPhoto(page);
      const offsets: number[] = [];

      await swipeHorizontally(page, { from: 300, to: 40, y: 300 }, async (step) => {
        if (step !== 5) return;
        offsets.push(
          await track.evaluate(
            (node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41,
          ),
        );
      });

      // 트랙이 왼쪽으로 밀려 다음 슬라이드가 화면에 걸쳐 있어야 한다.
      expect(offsets[0]).toBeLessThan(-20);
    });

    test("상세를 받지 못해도 스와이프가 오류와 재시도에 닿는다", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "터치 제스처는 모바일 컨텍스트 전용");
      let offline = false;
      await page.route("**/api/photos/*", (route) => (offline ? route.abort() : route.continue()));
      await openFirstPhoto(page);
      offline = true;

      // 첫 번째 사진은 이웃으로 받아 뒀고, 그 다음 사진의 상세 요청이 실패한다.
      await swipeHorizontally(page, { from: 300, to: 40, y: 300 });
      await expect(page).toHaveURL(/[?&]photo=p02/);

      // 받지 못한 사진으로 넘겨도 조용히 멈추지 않고 로딩 프레임이 상태를 알린다.
      await swipeHorizontally(page, { from: 300, to: 40, y: 300 });
      await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    });

    test("EXIF 패널이 펼쳐져 있으면 스와이프해도 사진이 바뀌지 않는다", async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "터치 제스처는 모바일 컨텍스트 전용");
      await openFirstPhoto(page);

      const handle = page.getByRole("button", { name: "사진 정보 펼치기" });
      await handle.click();
      await expect(page.getByRole("button", { name: "사진 정보 접기" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );

      await swipeHorizontally(page, { from: 300, to: 40, y: 300 });

      await expect(page).toHaveURL(/[?&]photo=p01/);
    });
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

  test("앨범 상세는 그 앨범의 사진만 앨범이 정한 순서로 보여 준다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "구성은 뷰포트와 무관하다");
    await photoAssertions.albumShowsOnlyItsPhotosInOrder(page);
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

    const minSlider = page.getByLabel("초점거리 최솟값");
    await minSlider.focus();
    await page.keyboard.press("ArrowRight");

    await expect(page).toHaveURL(/\?focalMin=17$/);
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
  });
});
