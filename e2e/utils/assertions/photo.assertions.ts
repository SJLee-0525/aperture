import { expect, type Page } from "@playwright/test";

import { commonAssertions } from "./common.assertions";

const photoAssertions = {
  async openPhoto(page: Page) {
    await page.getByRole("link", { name: "새벽의 항구" }).first().click();
    await expect(page).toHaveURL(/[?&]photo=p01/);
    await commonAssertions.dialogOpened(page, "새벽의 항구");
    await commonAssertions.closeDialog(page);
    await expect(page).not.toHaveURL(/[?&]photo=/);
  },

  async filterPhotos(page: Page) {
    await page.goto("/ko/photo?q=설원");
    await expect(page.getByRole("link", { name: "설원" })).toBeVisible();
    const square = page.getByRole("button", { name: "정사각" });
    await square.click();
    await expect(square).toHaveAttribute("aria-pressed", "true");
  },

  async openAlbum(page: Page) {
    const album = page.getByRole("link", { name: /도시의 밤/ });
    await expect(album).toHaveAttribute("href", "/ko/photo/albums/city-night");
    await album.click();
    await page.waitForURL(/\/ko\/photo\/albums\/city-night$/);
    await expect(page.getByRole("heading", { name: "도시의 밤" })).toBeVisible();
  },

  async openMapPhoto(page: Page) {
    await page.locator("aside").getByRole("link").first().click();
    await expect(page).toHaveURL(/[?&]photo=/);
    await expect(page.getByRole("dialog").last()).toBeVisible();
    await commonAssertions.closeDialog(page);
  },
};

export { photoAssertions };
