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

  test("관리자 스크롤바가 커서와 같은 액센트를 쓴다", async ({ page }) => {
    // 테마 초기화 스크립트가 어느 섹션에도 걸리지 않는 경로를 home 으로 두므로 관리자도
    // data-section="home" 이다. 랜딩 전용 무채색 규칙이 그 값에 걸려 있어, 스크롤바만
    // 무채색이 되고 커서는 --accent 를 쓰는 상태가 됐었다.
    await page.goto("/admin/photos");
    const probe = await page.evaluate(() => {
      const track = document.querySelector("[data-custom-scrollbar-ui]");
      const read = (el: Element, name: string) =>
        getComputedStyle(el).getPropertyValue(name).trim();
      return {
        accent: read(document.documentElement, "--accent"),
        scrollbar: track ? read(track, "--scrollbar-accent") : null,
      };
    });

    expect(probe.scrollbar).toBe(probe.accent);
  });

  test("maintenance 실행 버튼은 mock 모드에서 잠긴다", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/admin/maintenance");

    await expect(page.getByRole("button", { name: "변경 대상 확인" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "마이그레이션 실행" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "전체 임베딩 생성·갱신" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "삭제 대상 다시 확인" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "확인 후 삭제" })).toBeDisabled();
    await expect(page.getByText("mock 모드에서는 실행할 수 없습니다.").first()).toBeVisible();
  });
});
