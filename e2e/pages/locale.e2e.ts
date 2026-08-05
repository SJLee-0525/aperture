import { expect, test } from "@playwright/test";

/** 경로 기반 i18n — 무-로케일 리다이렉트·hreflang·언어 토글 내비게이션 검증. */
test.describe("경로 기반 i18n", () => {
  test("무-로케일 URL은 /ko로 리다이렉트된다 (v1 URL은 체인 없이 직행)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ko$/);

    await page.goto("/dev/projects");
    await expect(page).toHaveURL(/\/ko\/dev\/projects$/);

    // v1 사진 URL — /albums → /ko/photo/albums 직행 (중간 /photo/albums 경유 없음)
    await page.goto("/albums");
    await expect(page).toHaveURL(/\/ko\/photo\/albums$/);
  });

  test("지원하지 않는 언어 세그먼트는 404", async ({ page }) => {
    const response = await page.goto("/fr/dev");
    expect(response?.status()).toBe(404);
  });

  test("html lang과 hreflang 상호 참조를 언어별로 출력한다", async ({ page }) => {
    await page.goto("/ko/dev");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator('link[rel="alternate"][hreflang="ko"]')).toHaveAttribute(
      "href",
      /\/ko\/dev$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      /\/en\/dev$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/ko\/dev$/,
    );

    await page.goto("/en/dev");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/dev$/);
  });

  test("언어 토글이 같은 페이지의 다른 언어 경로로 이동한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "토글 UI는 데스크톱에서 대표 검증");

    await page.goto("/ko/dev/projects");
    await page.getByRole("button", { name: "언어" }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/dev\/projects$/);

    // 양방향 — en에서 다시 ko로 (버튼 라벨은 현재 언어 사전을 따른다)
    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitemradio", { name: "한국어" }).click();
    await expect(page).toHaveURL(/\/ko\/dev\/projects$/);
  });
});
