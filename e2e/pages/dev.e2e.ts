import { test } from "@playwright/test";

import { devAssertions } from "../utils/assertions/dev.assertions";

test.describe("Dev", () => {
  test("프로젝트 상세 모달을 열고 닫는다", async ({ page }) => {
    await page.goto("/dev/projects");
    await devAssertions.openProject(page);
  });
});
