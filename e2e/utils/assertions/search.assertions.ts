import { expect, type Page } from "@playwright/test";

const searchAssertions = {
  async submit(page: Page, mobile: boolean) {
    if (mobile) {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
    }

    const search = page.getByRole("search");
    await search.getByRole("textbox").fill("포트폴리오");
    await search.getByRole("button").click();

    await expect(page).toHaveURL(/\/search\?q=%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4$/);
    await expect(page.getByRole("heading", { name: "“포트폴리오”" })).toBeVisible();
    await expect(page.getByRole("link", { name: /개인 포트폴리오/ })).toBeVisible();
  },
};

export { searchAssertions };
