import { test } from "@playwright/test";

import { musicAssertions } from "../utils/assertions/music.assertions";

test.describe("Music", () => {
  test("연주 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/music");
    await musicAssertions.openWork(page);
  });

  test("수상 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/music/career");
    await musicAssertions.openAward(page);
  });
});
