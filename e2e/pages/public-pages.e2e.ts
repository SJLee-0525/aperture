import { test } from "@playwright/test";

import { publicPageAssertions } from "../utils/assertions/public-page.assertions";
import { PUBLIC_ROUTES } from "../utils/public-routes";

test.describe("모든 공개 페이지", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path}가 렌더링되고 테마를 변경할 수 있다`, async ({ page }) => {
      await page.goto(route.path);
      await publicPageAssertions.rendered(page, route);
      await publicPageAssertions.themeCanBeChanged(page);
    });
  }
});
