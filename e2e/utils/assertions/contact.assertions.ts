import { expect, type Page } from "@playwright/test";

const contactAssertions = {
  async validatesAndAcceptsInput(page: Page) {
    const form = page.locator("form");
    await form.getByLabel("이름").fill("테스트 사용자");
    const email = form.getByLabel("이메일");
    await email.fill("invalid-email");
    await form.getByRole("textbox", { name: "메시지", exact: true }).fill("E2E 문의 테스트");
    expect(await email.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(
      false,
    );
    await form.getByRole("button", { name: "보내기" }).click();

    await expect(page).toHaveURL(/\/ko\/contact$/);
  },
};

export { contactAssertions };
