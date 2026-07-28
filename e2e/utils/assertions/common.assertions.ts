import { expect, type Page } from "@playwright/test";

const commonAssertions = {
  async publicPageLoaded(page: Page, path: string) {
    await expect(page).toHaveURL(
      new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`),
    );
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("main, section").first()).toBeVisible();
  },

  async dialogOpened(page: Page, label: string | RegExp) {
    await expect(page.getByRole("dialog", { name: label })).toBeVisible();
  },

  async closeDialog(page: Page) {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Close" }).last().click();
    await expect(dialog).toBeHidden();
  },
};

export { commonAssertions };
