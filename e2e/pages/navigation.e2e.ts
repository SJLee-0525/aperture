import { test } from "@playwright/test";

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
