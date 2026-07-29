import { expect, type Page } from "@playwright/test";

const landingAssertions = {
  async loaded(page: Page) {
    await expect(page.getByRole("heading", { name: "Sungjoon Lee." })).toBeVisible();
    const sections = page.getByRole("navigation", { name: "섹션" });
    await expect(sections.getByRole("link", { name: "개발" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "사진" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "음악" })).toBeVisible();
  },

  async enterDev(page: Page) {
    await page
      .getByRole("navigation", { name: "섹션" })
      .getByRole("link", { name: "개발" })
      .click();
    await expect(page).toHaveURL(/\/dev\/projects$/);
    await expect(page.getByRole("heading", { name: "프로젝트" })).toBeVisible();
  },
};

export { landingAssertions };
