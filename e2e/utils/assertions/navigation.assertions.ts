import { expect, type Page } from "@playwright/test";

const navigationAssertions = {
  async desktopMegaMenu(page: Page) {
    const primary = page.getByRole("navigation", { name: "주요 메뉴" });
    await primary.getByRole("button", { name: "사진" }).click();
    const albums = primary.getByRole("link", { name: "앨범" });
    await expect(albums).toBeVisible();
    await albums.click();
    await expect(page).toHaveURL(/\/ko\/photo\/albums$/);
  },

  async mobileMenu(page: Page) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    // 푸터 사이트맵에도 동명 링크가 있어 메뉴 시트(dialog)로 스코프
    const menu = page.getByRole("dialog");
    const dev = menu.getByRole("button", { name: "개발" });
    await dev.click();
    await expect(dev).toHaveAttribute("aria-expanded", "true");
    await menu.getByRole("link", { name: "프로젝트" }).click();
    await expect(page).toHaveURL(/\/ko\/dev\/projects$/);
  },

  async mobileTab(page: Page) {
    const tabs = page.getByRole("navigation", { name: "모바일 내비게이션" });
    await tabs.getByRole("link", { name: "앨범" }).click();
    await expect(page).toHaveURL(/\/ko\/photo\/albums$/);
  },
};

export { navigationAssertions };
