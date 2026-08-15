import { expect, type Page } from "@playwright/test";

const searchAssertions = {
  async submit(page: Page, mobile: boolean) {
    if (mobile) {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
    }

    const search = page.getByRole("search");
    // 데스크톱 검색창은 자동완성 콤보박스(role="combobox"), 암시적 textbox 롤 대체.
    // 모바일 버거 메뉴 검색은 자동완성이 없어 평범한 textbox 다.
    await search.getByRole(mobile ? "textbox" : "combobox").fill("포트폴리오");
    await search.getByRole("button", { name: /검색/ }).click();

    // dev 서버가 다른 라우트를 컴파일 중이면 클라이언트 내비게이션의 RSC 응답이 그 뒤에 줄 선다.
    // admin 스펙과 같은 여유값 — 사전 빌드된 프로덕션 실행에서는 그대로 즉시 통과한다.
    await expect(page).toHaveURL(/\/ko\/search\?q=%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4$/, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "“포트폴리오”" })).toBeVisible();
    await expect(page.getByRole("link", { name: /개인 포트폴리오/ })).toBeVisible();

    if (mobile) {
      const firstResult = page.locator("main li a").first();
      // 제목·메타는 hitText > hitRow 안의 span — 두 단계 중첩(span span span)이라
      // 행 래퍼(hitRow)·본문 스니펫(hitText 직속)은 잡히지 않는다.
      const textSpans = firstResult.locator("span span span");
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
