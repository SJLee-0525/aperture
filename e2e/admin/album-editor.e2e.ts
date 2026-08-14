import { expect, test } from "@playwright/test";

import { resetAdminStorage } from "../utils/admin-fixtures";

/** mock 사진 seed 의 제목 — 앨범에 담을 두 장. */
const FIRST_PHOTO = "새벽의 항구";
const SECOND_PHOTO = "골목, 5시";

/**
 * 드롭 뒤 dnd-kit 이 document 의 click 을 삼키는 구간(ms).
 *
 * `AbstractPointerSensor.detach()` 가 `setTimeout(removeAll, 50)` 으로 click 리스너를 늦게
 * 뗀다 — 드래그를 끝낸 클릭이 그 아래 버튼을 누르지 않게 하려는 장치다. 사람 손으로는
 * 닿지 않는 창이지만 자동화는 그 안에서 다음 버튼을 누르므로, 드래그 직후 클릭하는
 * 곳에서만 창이 닫히기를 기다린다. 라이브러리가 정한 고정 시간이라 관찰할 DOM 신호가 없다.
 * 50ms 에 CI 지연 여유를 더해 잡는다.
 */
const DND_CLICK_SUPPRESSION_MS = 250;

/**
 * 앨범 편집 폼 — 사진 선택·커버 지정·저장, 그리고 사진 삭제 시 앨범 참조 정리.
 *
 * 마지막 단계는 live 의 batch 정리(`deletePhoto`)에 해당하는 mock 후처리
 * (`removePhotoReferencesFromAlbums`)가 실제로 앨범 문서를 고치는지 확인한다.
 */
test.describe("Admin · 앨범 편집", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "데스크톱 전용 화면");

  test.beforeEach(async ({ page }) => {
    await resetAdminStorage(page);
    page.on("dialog", (dialog) => dialog.accept());
  });

  test("사진 선택·커버 지정 → 저장 → 사진 삭제 시 앨범에서도 빠진다", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/admin/albums/new");
    await expect(page.getByRole("heading", { name: "새 앨범" })).toBeVisible();

    await page.getByLabel("제목 (한국어) *").fill("E2E 앨범");

    // 전체 사진 그리드에서 두 장을 추가한다. 첫 장이 자동으로 커버가 된다.
    await page.getByRole("button", { name: FIRST_PHOTO, exact: true }).click();
    await page.getByRole("button", { name: SECOND_PHOTO, exact: true }).click();
    await expect(page.getByText("선택된 사진 (2장)")).toBeVisible();

    // 선택 스트립에서 두 번째 사진을 맨 앞으로 드래그한다(photoIds 순서 = 배열 순서).
    const strip = page.locator("ul").filter({
      has: page.getByRole("button", { name: `${FIRST_PHOTO} 순서 이동` }),
    });
    const from = await page
      .getByRole("button", { name: `${SECOND_PHOTO} 순서 이동` })
      .boundingBox();
    const to = await page.getByRole("button", { name: `${FIRST_PHOTO} 순서 이동` }).boundingBox();
    if (!from || !to) throw new Error("드래그 대상 위치를 읽지 못했다.");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2 - 4, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(
      strip
        .locator("li")
        .first()
        .getByRole("button", { name: `${SECOND_PHOTO} 순서 이동` }),
    ).toBeVisible();

    // 커버를 두 번째 사진으로 옮긴다 — 활성화된 "커버로" 버튼은 커버가 아닌 칩의 것이다.
    await page.waitForTimeout(DND_CLICK_SUPPRESSION_MS);
    await page.getByRole("button", { name: "커버로" }).click();
    await expect(
      strip.locator("li").first().getByRole("button", { name: "커버", exact: true }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/admin\/albums$/);
    const albumRow = page.locator("li").filter({ hasText: "E2E 앨범" });
    await expect(albumRow).toBeVisible();
    await expect(albumRow).toContainText("2장");

    // 다시 열면 드래그한 순서(두 번째 사진이 앞)와 커버가 저장돼 있다.
    await albumRow.getByRole("link", { name: "수정" }).click();
    await expect(page.getByText("선택된 사진 (2장)")).toBeVisible();
    const savedStrip = page.locator("ul").filter({
      has: page.getByRole("button", { name: `${SECOND_PHOTO} 순서 이동` }),
    });
    await expect(
      savedStrip
        .locator("li")
        .first()
        .getByRole("button", { name: `${SECOND_PHOTO} 순서 이동` }),
    ).toBeVisible();
    await expect(
      savedStrip.locator("li").first().getByRole("button", { name: "커버", exact: true }),
    ).toBeDisabled();
    await page.goto("/admin/albums");

    // 앨범에 담긴 사진을 삭제하면 앨범 참조도 함께 정리된다.
    await page.goto("/admin/photos");
    const photoRow = page.locator("li").filter({ hasText: FIRST_PHOTO });
    await expect(photoRow).toBeVisible({ timeout: 30_000 });
    await photoRow.getByRole("button", { name: "삭제" }).click();
    await expect(photoRow).toHaveCount(0);

    await page.goto("/admin/albums");
    await expect(page.locator("li").filter({ hasText: "E2E 앨범" })).toContainText("1장");

    // 편집 화면에서도 남은 한 장만 선택되어 있다.
    await page
      .locator("li")
      .filter({ hasText: "E2E 앨범" })
      .getByRole("link", { name: "수정" })
      .click();
    await expect(page.getByText("선택된 사진 (1장)")).toBeVisible();
  });
});
