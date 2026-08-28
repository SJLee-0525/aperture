import { expect, test } from "@playwright/test";

/**
 * 랜딩의 진입 애니메이션은 초기 `opacity: 0` 으로 시작한다. 그 선언을 `html[data-js]` 아래로
 * 게이트하지 않으면 스크립트가 실행되지 않는 환경에서 이 지면의 유일한 내비게이션과 리드
 * 문장이 화면에 나타나지 않는다. 요소는 DOM 에 있고 포커스도 되지만 눈에는 아무것도 없다.
 */
test.describe("랜딩", () => {
  test("JS 없이도 진입 링크와 리드 문장이 보인다", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/ko");

    const rows = page.locator("main a[href^='/ko/']");
    await expect(rows.first()).toBeVisible();
    const opacity = await rows.first().evaluate((element) => getComputedStyle(element).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.9);

    await context.close();
  });
});
