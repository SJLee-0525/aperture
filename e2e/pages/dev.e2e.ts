import { expect, test } from "@playwright/test";

import { devAssertions } from "../utils/assertions/dev.assertions";
import { commonAssertions } from "../utils/assertions/common.assertions";

test.describe("Dev", () => {
  test("프로젝트 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/dev/projects");
    await devAssertions.openProject(page);

    await page.goForward();
    await expect(page).toHaveURL(/[?&]project=portfolio/);
    await commonAssertions.dialogOpened(page, "개인 포트폴리오");
  });

  test("직접 진입한 프로젝트 모달을 닫아도 프로젝트 페이지에 머문다", async ({ page }) => {
    await page.goto("/dev/projects?project=portfolio");
    await commonAssertions.dialogOpened(page, "개인 포트폴리오");

    await commonAssertions.closeDialog(page);

    await expect(page).toHaveURL(/\/dev\/projects$/);
  });

  test("프로젝트 모달은 스크롤 최상단에서 열린다", async ({ page }) => {
    await page.goto("/dev/projects");
    await page.getByRole("button", { name: /개인 포트폴리오/ }).click();
    const dialog = page.getByRole("dialog", { name: "개인 포트폴리오" });
    await expect(dialog).toBeVisible();

    const overlayScrollTop = await dialog.evaluate(
      (element) => element.parentElement?.scrollTop ?? -1,
    );

    expect(overlayScrollTop).toBe(0);
  });

  test("프로젝트 이미지 라이트박스의 기본 이미지 메뉴를 차단한다", async ({ page }) => {
    await page.goto("/dev/projects?project=portfolio");
    const projectDialog = page.getByRole("dialog", { name: "개인 포트폴리오" });
    await projectDialog.locator("figure button").first().click();

    const lightbox = page.locator("[data-image-lightbox]");
    await expect(lightbox).toBeVisible();
    const defaultPrevented = lightbox.evaluate(
      (element) =>
        new Promise<boolean>((resolve) => {
          element.addEventListener("contextmenu", (event) => resolve(event.defaultPrevented), {
            once: true,
          });
          const box = element.getBoundingClientRect();
          document
            .elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
            ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
        }),
    );

    await expect(defaultPrevented).resolves.toBe(true);
  });

  test("프로젝트 이미지 라이트박스의 크롬과 스와이프를 제어한다", async ({ page }) => {
    await page.goto("/dev/projects?project=portfolio");
    const projectDialog = page.getByRole("dialog", { name: "개인 포트폴리오" });
    await projectDialog.locator("figure button").first().click();

    const lightbox = page.locator("[data-image-lightbox]");
    const image = lightbox.locator("img").first();
    const close = lightbox.locator("[data-image-lightbox-close]");
    await expect(close).toBeVisible();
    await expect(lightbox.getByText("1 / 3")).toBeVisible();
    await expect(lightbox.locator("img")).toHaveCount(2);

    await image.click();
    await expect(close).toBeHidden();
    await image.click();
    await expect(close).toBeVisible();

    const track = lightbox.locator("[data-image-lightbox-track]");
    const draggedDistance = await track.evaluate((element) => {
      element.scrollLeft = element.clientWidth * 0.6;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
      return element.scrollLeft;
    });
    expect(draggedDistance).toBeGreaterThan(0);
    await expect(lightbox.getByText("2 / 3")).toBeVisible();
    await expect(lightbox.locator("img")).toHaveCount(3);

    const lightboxBox = await lightbox.boundingBox();
    expect(lightboxBox).not.toBeNull();
    await page.mouse.click(lightboxBox!.x + 2, lightboxBox!.y + 2);
    await expect(lightbox).toBeHidden();
    await expect(projectDialog).toBeVisible();
  });
});
