import path from "node:path";

import { expect, test } from "@playwright/test";

import { resetAdminStorage } from "../utils/admin-fixtures";

/** 픽스처에 새겨 둔 촬영 정보 — `e2e/fixtures/generate-exif-sample.mjs` 의 값과 짝이다. */
const FIXTURE = path.resolve(__dirname, "../fixtures/exif-sample.jpg");

/**
 * 사진 편집 폼 — 파일 선택 → EXIF 자동 입력 → 태그 선택 → 저장.
 *
 * mock 모드에서도 EXIF 추출과 webp 압축은 실제 파이프라인이 돈다는 것을 검증한다.
 * 저장 단계만 objectURL 이라 목록의 썸네일 URL 은 `blob:` 이다.
 */
test.describe("Admin · 사진 편집", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "데스크톱 전용 화면");

  test.beforeEach(async ({ page }) => {
    await resetAdminStorage(page);
  });

  test("EXIF 픽스처 업로드가 폼을 자동으로 채우고 저장된다", async ({ page }) => {
    // dev 서버 첫 컴파일 + exifr·압축 동적 로드를 담는다.
    test.setTimeout(120_000);
    await page.goto("/admin/photos/new");
    await expect(page.getByRole("heading", { name: "새 사진" })).toBeVisible();

    await page.getByLabel("제목 (한국어) *").fill("E2E 업로드 사진");
    await page.locator('input[type="file"]').setInputFiles(FIXTURE);

    // 압축 前 원본에서 추출한 EXIF 가 각 필드로 들어온다.
    await expect(page.getByLabel("조리개")).toHaveValue("f/2.8", { timeout: 30_000 });
    await expect(page.getByLabel("셔터")).toHaveValue("1/250");
    await expect(page.getByLabel("ISO", { exact: true })).toHaveValue("400");
    await expect(page.getByLabel("초점거리")).toHaveValue("35 mm");
    await expect(page.getByLabel("카메라")).toHaveValue("SONY ILCE-7M4");
    await expect(page.getByLabel("렌즈")).toHaveValue("FE 35mm F1.8");
    await expect(page.getByLabel("촬영일시")).toHaveValue("2026-05-04T10:30");

    // 태그 사전(site/config mock)의 칩을 골라 저장한다.
    const tagChip = page.getByRole("button", { name: "야경", exact: true });
    await tagChip.click();

    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/admin\/photos$/);
    await expect(page.locator("li").filter({ hasText: "E2E 업로드 사진" })).toBeVisible({
      timeout: 30_000,
    });
  });
});
