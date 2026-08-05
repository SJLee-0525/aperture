import { expect, test } from "@playwright/test";

import { contactAssertions } from "../utils/assertions/contact.assertions";

test("문의 폼을 입력하고 브라우저 유효성 검사를 수행한다", async ({ page }, testInfo) => {
  await page.goto("/ko/contact");
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("textbox", { name: "이름" })).toHaveCSS("font-size", "15px");
  }
  await contactAssertions.validatesAndAcceptsInput(page);
});
