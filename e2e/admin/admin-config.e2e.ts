import { expect, test } from "@playwright/test";

import { resetAdminStorage } from "../utils/admin-fixtures";

/**
 * 설정 화면 — 태그 사전 편집이 사진 폼 선택지에 반영되는지, 그리고 `site/config` 를
 * 나눠 쓰는 화면들이 자기 소유 필드만 병합 저장해 서로를 덮어쓰지 않는지 확인한다.
 */
test.describe("Admin · 설정", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "데스크톱 전용 화면");

  test.beforeEach(async ({ page }) => {
    await resetAdminStorage(page);
  });

  test("태그 사전의 추가·수정·삭제가 사진 폼 선택지에 반영된다", async ({ page }) => {
    test.setTimeout(120_000);
    // 태그 삭제는 window.confirm 을 거친다 — 자동 수락.
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/admin/tags");
    await expect(page.getByRole("heading", { name: "태그 사전", level: 1 })).toBeVisible();

    // 추가 — 기존 태그 행에도 "한국어" sr 라벨이 있어 추가 폼(form 요소)으로 좁힌다.
    const addForm = page.locator("form");
    await addForm.getByLabel("id (영문 슬러그) *").fill("e2e");
    await addForm.getByLabel("한국어", { exact: true }).fill("이투이");
    await addForm.getByLabel("English", { exact: true }).fill("E2E");
    await addForm.getByRole("button", { name: "+ 태그 추가" }).click();

    // 라벨 수정(night)과 삭제(tokyo) — id 는 행의 code 로 표시된다.
    const nightRow = page.locator("li").filter({ hasText: "night" });
    await nightRow.getByLabel("한국어", { exact: true }).fill("이름바꿈");
    await page
      .locator("li")
      .filter({ hasText: "tokyo" })
      .getByRole("button", { name: "삭제" })
      .click();

    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장되었습니다.")).toBeVisible();

    // 사진 폼 선택지가 사전 편집 결과를 그대로 읽는다.
    await page.goto("/admin/photos/new");
    await expect(page.getByRole("button", { name: "이투이", exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "이름바꿈", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "도쿄", exact: true })).toHaveCount(0);
  });

  test("전역과 사진 소개를 차례로 저장해도 서로의 값을 지키는 병합 계약", async ({ page }) => {
    test.setTimeout(120_000);

    // 전역 화면이 소유한 tagline 저장.
    await page.goto("/admin/global");
    const tagline = page.getByLabel("타이핑 (한국어)");
    await expect(tagline).toBeVisible({ timeout: 30_000 });
    await tagline.fill("E2E 태그라인");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장되었습니다.")).toBeVisible();

    // 사진 소개 화면이 소유한 bio 저장 — 같은 문서의 다른 필드다.
    await page.goto("/admin/site");
    const bio = page.getByLabel("바이오 (한국어)");
    await expect(bio).toBeVisible({ timeout: 30_000 });
    await bio.fill("E2E 바이오");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장되었습니다.")).toBeVisible();

    // 전역 값이 사진 소개 저장에 덮이지 않았다.
    await page.goto("/admin/global");
    await expect(page.getByLabel("타이핑 (한국어)")).toHaveValue("E2E 태그라인", {
      timeout: 30_000,
    });
  });
});
