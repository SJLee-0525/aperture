import { expect, type Page } from "@playwright/test";

const commonAssertions = {
  async publicPageLoaded(page: Page, path: string) {
    await expect(page).toHaveURL(
      new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`),
    );
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("main, section").first()).toBeVisible();
  },

  async dialogOpened(page: Page, label: string | RegExp) {
    await expect(page.getByRole("dialog", { name: label })).toBeVisible();
  },

  async closeDialog(page: Page) {
    const dialogs = page.getByRole("dialog");
    await dialogs.getByRole("button", { name: "닫기" }).last().click();
    // 사진 상세는 ready 모달과 퇴장 중인 pending 모달이 잠시 겹칠 수 있다.
    // 단일 요소용 toBeHidden 대신 모든 모달이 걷히는 닫기 계약을 확인한다.
    await expect(dialogs).toHaveCount(0);
  },
};

export { commonAssertions };
