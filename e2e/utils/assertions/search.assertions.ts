import { expect, type Page } from "@playwright/test";

const searchAssertions = {
  async submit(page: Page, mobile: boolean) {
    if (mobile) {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
    }

    const search = page.getByRole("search");
    // 검색 input은 자동완성 콤보박스(role="combobox") — 암시적 textbox 롤이 대체된다.
    await search.getByRole("combobox").fill("포트폴리오");
    await search.getByRole("button", { name: /검색/ }).click();

    await expect(page).toHaveURL(/\/search\?q=%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4$/);
    await expect(page.getByRole("heading", { name: "“포트폴리오”" })).toBeVisible();
    await expect(page.getByRole("link", { name: /개인 포트폴리오/ })).toBeVisible();

    if (mobile) {
      const firstResult = page.locator("main li a").first();
      // 제목·메타는 hitText 래퍼 안의 중첩 span — 결과에 썸네일 span이 있든 없든 동일하게 잡힌다.
      const textSpans = firstResult.locator("span span");
      await textSpans.last().evaluate((meta) => {
        meta.textContent = "서울역, 세종대로, 봉래동2가, 회현동, 중구, 서울특별시, 04509, 대한민국";
      });

      const [titleBox, metaBox] = await Promise.all([
        textSpans.first().boundingBox(),
        textSpans.last().boundingBox(),
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
