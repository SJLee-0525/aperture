import { expect, test } from "@playwright/test";

test.describe("Custom cursor", () => {
  test("가운데 클릭 자동 스크롤을 시작하고 Esc로 종료한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 커서는 fine pointer에서만 활성화");

    await page.goto("/photo");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-custom-cursor"));

    const anchor = page.locator("[data-autoscroll-anchor]");
    await page.mouse.click(50, 500, { button: "middle" });
    await expect(anchor).toHaveAttribute("data-visible", "true");

    await page.mouse.move(50, 850);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
    await expect(anchor).toHaveAttribute("data-visible", "false");
  });

  test("링크의 가운데 클릭은 자동 스크롤로 가로채지 않는다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "커스텀 커서는 fine pointer에서만 활성화");

    await page.goto("/contact");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-custom-cursor"));
    await page.locator("a").first().dispatchEvent("mousedown", { button: 1 });

    await expect(page.locator("[data-autoscroll-anchor]")).toHaveAttribute("data-visible", "false");
  });
});
