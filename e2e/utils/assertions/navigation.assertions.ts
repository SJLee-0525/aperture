import { expect, type Page } from "@playwright/test";

const navigationAssertions = {
  async desktopMegaMenu(page: Page) {
    const primary = page.getByRole("navigation", { name: "주요 메뉴" });
    await primary.getByRole("button", { name: "사진" }).click();
    const albums = primary.getByRole("link", { name: "앨범" });
    await expect(albums).toBeVisible();
    await albums.click();
    await expect(page).toHaveURL(/\/photo\/albums$/);
  },

  async mobileMenu(page: Page) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    const dev = page.getByRole("button", { name: "개발" });
    await dev.click();
    await expect(dev).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("link", { name: "프로젝트" }).click();
    await expect(page).toHaveURL(/\/dev\/projects$/);
  },

  async mobileTab(page: Page) {
    const tabs = page.getByRole("navigation", { name: "Mobile navigation" });
    await tabs.getByRole("link", { name: "앨범" }).click();
    await expect(page).toHaveURL(/\/photo\/albums$/);
  },
};

export { navigationAssertions };
