import { expect, test } from "@playwright/test";

test.describe("Custom cursor", () => {
  test("지도 위치 목록과 사진 필터 드롭다운에 액센트 스크롤바를 적용한다", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "커스텀 로컬 스크롤바는 fine pointer에서만 활성화",
    );

    await page.setViewportSize({ width: 1440, height: 600 });
    await page.goto("/photo/map");
    await expect(page.locator("aside[data-accent-scrollbar]")).toBeVisible();
    await expect(page.locator("[data-custom-scrollbar-ui]")).toHaveAttribute(
      "aria-controls",
      "map-location-scroll-container",
    );

    await page.goto("/photo");
    await page.getByRole("button", { name: "필터" }).click();
    await page.getByRole("button", { name: "카메라" }).click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toHaveAttribute("data-accent-scrollbar", "true");
    const listboxOverflows = await listbox.evaluate(
      (element) => element.scrollHeight > element.clientHeight + 1,
    );
    await expect(page.locator("[data-custom-scrollbar-ui]")).toHaveAttribute(
      "aria-controls",
      listboxOverflows ? "filter-select-scroll-container" : "page-content",
    );
  });

  test("커스텀 스크롤바와 커서가 연동되고 썸을 드래그할 수 있다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 스크롤바는 fine pointer에서만 활성화");

    await page.goto("/photo");
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-custom-scrollbar"),
    );

    const track = page.locator("[data-custom-scrollbar-ui]");
    const thumb = page.locator("[data-custom-scrollbar-thumb]");
    await expect(track).toHaveAttribute("data-visible", "true");

    await page.evaluate(() => window.scrollTo(0, 400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const [scrollTop, ariaValue] = await Promise.all([
          page.evaluate(() => window.scrollY),
          track.getAttribute("aria-valuenow"),
        ]);
        return Math.abs(scrollTop - Number(ariaValue));
      })
      .toBeLessThan(2);
    const thumbBox = await thumb.boundingBox();
    expect(thumbBox).not.toBeNull();
    if (!thumbBox) return;

    const grabY = Math.min(8, thumbBox.height / 2);
    await thumb.hover({ position: { x: thumbBox.width / 2, y: grabY } });
    await expect(page.locator("[data-custom-cursor-ui]")).toHaveAttribute("data-mode", "scrollbar");
    const initialScrollTop = await page.evaluate(() => window.scrollY);

    await page.mouse.down();
    await expect(track).toHaveAttribute("data-dragging", "true");
    await expect
      .poll(() => page.evaluate((top) => Math.abs(window.scrollY - top), initialScrollTop))
      .toBeLessThan(3);
    await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + grabY + 180, { steps: 5 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialScrollTop);
    await page.mouse.up();
    await expect(track).toHaveAttribute("data-dragging", "false");
  });

  test("모달이 열리면 페이지 트랙을 모달 스크롤로 전환한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 스크롤바는 fine pointer에서만 활성화");

    await page.goto("/music");
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-custom-scrollbar"),
    );
    await page.locator("main button").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const track = page.locator("[data-custom-scrollbar-ui]");
    await expect(track).toHaveAttribute("data-scroll-scope", "modal");
    await expect
      .poll(() =>
        page
          .locator("[data-custom-scroll-container]")
          .evaluate((element) => getComputedStyle(element).scrollbarWidth),
      )
      .toBe("none");
  });

  test("사진 상세 모달도 정보 패널 스크롤로 전환한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 스크롤바는 fine pointer에서만 활성화");

    await page.goto("/photo?photo=p01");
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();
    await expect(page.locator('[data-photo-modal-image-area="ready"]')).toBeVisible();
    await expect(page.locator("#photo-pending-scroll-container")).toHaveCount(0);

    const track = page.locator("[data-custom-scrollbar-ui]");
    await expect(track).toHaveAttribute("data-scroll-scope", "modal");
    await expect(track).toHaveAttribute("aria-controls", "photo-modal-scroll-container");
  });

  test("가운데 클릭 자동 스크롤을 시작하고 Esc로 종료한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 커서는 fine pointer에서만 활성화");

    await page.goto("/photo");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-custom-cursor"));

    const anchor = page.locator("[data-autoscroll-anchor]");
    await page.mouse.click(50, 500, { button: "middle" });
    await expect(anchor).toHaveAttribute("data-visible", "true");

    await page.mouse.move(50, 850);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await expect(anchor).toHaveAttribute("data-visible", "false");
  });

  test("링크의 가운데 클릭은 자동 스크롤로 가로채지 않는다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 커서는 fine pointer에서만 활성화");

    await page.goto("/contact");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-custom-cursor"));
    await page.locator("a").first().dispatchEvent("mousedown", { button: 1 });

    await expect(page.locator("[data-autoscroll-anchor]")).toHaveAttribute("data-visible", "false");
  });

  test("문의 textarea 리사이즈 핸들에서도 커스텀 커서를 유지한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 커서는 fine pointer에서만 활성화");

    await page.goto("/contact");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-custom-cursor"));
    await expect(page.locator("[data-intro-splash]")).toBeHidden();

    const textarea = page.getByRole("textbox", { name: "메시지" });
    await expect(textarea).toHaveCSS("resize", "none");

    const handle = page.locator("[data-textarea-resizer]");
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    if (!handleBox) return;
    expect(handleBox.width).toBeGreaterThanOrEqual(40);
    expect(handleBox.height).toBeGreaterThanOrEqual(40);

    const initialHeight = await textarea.evaluate(
      (element) => (element as HTMLTextAreaElement).offsetHeight,
    );
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await expect(page.locator("[data-custom-cursor-ui]")).toHaveAttribute("data-mode", "dot");
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height + 48, {
      steps: 5,
    });
    await page.mouse.up();
    await expect
      .poll(() => textarea.evaluate((element) => (element as HTMLTextAreaElement).offsetHeight))
      .toBeGreaterThan(initialHeight);

    const draggedHeight = await textarea.evaluate(
      (element) => (element as HTMLTextAreaElement).offsetHeight,
    );
    await handle.press("ArrowDown");
    await expect
      .poll(() => textarea.evaluate((element) => (element as HTMLTextAreaElement).offsetHeight))
      .toBeGreaterThan(draggedHeight);
  });
});
