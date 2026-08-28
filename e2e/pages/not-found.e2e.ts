import { expect, test } from "@playwright/test";

/**
 * 루트 `app/not-found.tsx` 가 앱 전체의 미매칭 URL 을 처리하므로, `[lang]/not-found.tsx`
 * 만으로는 `/en/bogus` 가 로케일 밖 404 로 간다. catch-all 이 있어야 URL 의 언어로 렌더된다.
 */
test.describe("404", () => {
  test("로케일 안의 미매칭 주소는 그 언어로 안내한다", async ({ page }) => {
    for (const path of ["/en/bogus", "/en/a/b"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
      await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
    }
  });

  test("한국어 경로도 같은 규칙을 따른다", async ({ page }) => {
    const response = await page.goto("/ko/a/b");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /홈/ })).toHaveAttribute("href", "/ko");
  });
});
