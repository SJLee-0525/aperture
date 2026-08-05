import { test } from "@playwright/test";

import { searchAssertions } from "../utils/assertions/search.assertions";

test("viewport에 맞는 검색 UI로 mock 콘텐츠를 찾는다", async ({ page }, testInfo) => {
  await page.goto("/ko");
  await searchAssertions.submit(page, testInfo.project.name === "mobile");
});
