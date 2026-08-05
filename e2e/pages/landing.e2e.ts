import { test } from "@playwright/test";

import { commonAssertions } from "../utils/assertions/common.assertions";
import { landingAssertions } from "../utils/assertions/landing.assertions";

test.describe("Landing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ko");
  });

  test("공개 허브와 세 섹션 진입점이 보인다", async ({ page }) => {
    await commonAssertions.publicPageLoaded(page, "/ko");
    await landingAssertions.loaded(page);
  });

  test("Dev 진입점을 클릭해 프로젝트로 이동한다", async ({ page }) => {
    await landingAssertions.enterDev(page);
  });

  test("배경 글로우가 가로 overflow를 만들지 않는다", async ({ page }) => {
    await landingAssertions.glowDoesNotCreateHorizontalOverflow(page);
  });
});
