import { test } from "@playwright/test";

import { contactAssertions } from "../utils/assertions/contact.assertions";

test("문의 폼을 입력하고 브라우저 유효성 검사를 수행한다", async ({ page }) => {
  await page.goto("/contact");
  await contactAssertions.validatesAndAcceptsInput(page);
});
