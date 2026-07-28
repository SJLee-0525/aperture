import { expect, type Page } from "@playwright/test";

import { commonAssertions } from "./common.assertions";

const musicAssertions = {
  async openWork(page: Page) {
    await page.getByRole("button", { name: /겨울 나그네/ }).click();
    await expect(page).toHaveURL(/[?&]work=winterreise/);
    await commonAssertions.dialogOpened(page, "겨울 나그네");
    await expect(page.getByText("Gute Nacht")).toBeVisible();
    await commonAssertions.closeDialog(page);
  },

  async openAward(page: Page) {
    await page.getByRole("button", { name: /국제 피아노 콩쿠르/ }).click();
    await expect(page).toHaveURL(/[?&]award=geneva-2024/);
    await commonAssertions.dialogOpened(page, /국제 피아노 콩쿠르/);
    await commonAssertions.closeDialog(page);
  },
};

export { musicAssertions };
