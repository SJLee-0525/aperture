import { expect, test } from "@playwright/test";

import { resetAdminStorage } from "../utils/admin-fixtures";

/**
 * 관리자 셸의 mock 표시 — 상단 배지와, 실데이터 연결이 필요한 maintenance 실행 잠금.
 */
test.describe("Admin · mock 표시", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "데스크톱 전용 화면");

  test.beforeEach(async ({ page }) => {
    await resetAdminStorage(page);
  });

  test("모든 관리자 화면 상단에 mock 배지가 붙는다", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/admin");
    await expect(page.getByRole("status")).toContainText("mock 모드");
  });

  test("maintenance 실행 버튼은 mock 모드에서 잠긴다", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/admin/maintenance");

    await expect(page.getByRole("button", { name: "변경 대상 확인" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "마이그레이션 실행" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "전체 임베딩 생성·갱신" })).toBeDisabled();
    await expect(page.getByText("mock 모드에서는 실행할 수 없습니다.").first()).toBeVisible();
  });
});
