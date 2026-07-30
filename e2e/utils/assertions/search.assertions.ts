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

    if (mobile) {
      const firstResult = page.locator("main li a").first();
      await firstResult
        .locator("span")
        .last()
        .evaluate((meta) => {
          meta.textContent =
            "서울역, 세종대로, 봉래동2가, 회현동, 중구, 서울특별시, 04509, 대한민국";
        });

      const [titleBox, metaBox] = await Promise.all([
        firstResult.locator("span").first().boundingBox(),
        firstResult.locator("span").last().boundingBox(),
      ]);
      expect(titleBox).not.toBeNull();
      expect(metaBox).not.toBeNull();
      expect(metaBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);

      const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(documentWidth).toBe(viewportWidth);
    }
  },
};

export { searchAssertions };
