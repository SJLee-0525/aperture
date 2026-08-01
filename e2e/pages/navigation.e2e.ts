import { expect, test } from "@playwright/test";

import { navigationAssertions } from "../utils/assertions/navigation.assertions";

test("viewport에 맞는 공개 navigation으로 이동한다", async ({ page }, testInfo) => {
  await page.goto("/");

  if (testInfo.project.name === "mobile") {
    await navigationAssertions.mobileMenu(page);
    await page.goto("/photo");
    await navigationAssertions.mobileTab(page);
    return;
  }

  await navigationAssertions.desktopMegaMenu(page);
});

test("모바일 브라우저 테마색을 페이지 배경과 라이트·다크 테마에 맞춘다", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "동일한 메타 로직은 데스크톱에서 대표 실행");
  const themeColor = page.locator('meta[name="theme-color"]');

  await page.goto("/");
  await expect(themeColor).toHaveAttribute("content", "#ffffff");

  await page.goto("/photo");
  await expect(themeColor).toHaveAttribute("content", "#ffffff");
  await page.getByRole("button", { name: "테마 전환" }).first().click();
  await expect(themeColor).toHaveAttribute("content", "#000000");

  for (const path of ["/music", "/dev/projects", "/contact", "/"] as const) {
    await page.goto(path);
    await expect(themeColor).toHaveAttribute("content", "#000000");
  }
});
