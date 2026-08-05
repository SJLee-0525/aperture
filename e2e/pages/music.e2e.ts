import { expect, test } from "@playwright/test";

import { musicAssertions } from "../utils/assertions/music.assertions";

test.describe("Music", () => {
  test("연주 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/ko/music");
    await musicAssertions.openWork(page);
  });

  test("예매 링크가 없는 연주 상세에는 예매 버튼을 표시하지 않는다", async ({ page }) => {
    await page.goto("/ko/music");
    await page.getByRole("button", { name: /겨울 나그네/ }).click();

    const dialog = page.getByRole("dialog", { name: "겨울 나그네" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "예매하기" })).toHaveCount(0);
  });

  test("수상 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/ko/music/career");
    await musicAssertions.openAward(page);
  });
});
