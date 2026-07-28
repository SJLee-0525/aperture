import { expect, type Page } from "@playwright/test";

import { commonAssertions } from "./common.assertions";

const devAssertions = {
  async openProject(page: Page) {
    await page.getByRole("button", { name: /개인 포트폴리오/ }).click();
    await expect(page).toHaveURL(/[?&]project=portfolio/);
    await commonAssertions.dialogOpened(page, "개인 포트폴리오");
    await expect(page.getByText("Lighthouse 성능 50점대 → 90+ 개선")).toBeVisible();
    await commonAssertions.closeDialog(page);
  },
};

export { devAssertions };
