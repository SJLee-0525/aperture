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
});
