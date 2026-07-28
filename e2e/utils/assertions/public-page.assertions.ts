import { expect, type Page } from "@playwright/test";

import type { PublicRoute } from "../public-routes";

const publicPageAssertions = {
  async rendered(page: Page, route: PublicRoute) {
    await expect(page).toHaveURL(
      new RegExp(`${route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`),
    );
    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByText(route.expectedText, { exact: false }).filter({ visible: true }).first(),
    ).toBeVisible();
  },

  async themeCanBeChanged(page: Page) {
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: "Theme" }).click();
    await expect(html).not.toHaveAttribute("data-theme", before ?? "");
  },
};

export { publicPageAssertions };
