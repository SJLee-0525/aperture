import { expect, test, type Page } from "@playwright/test";

import { resetAdminStorage } from "../utils/admin-fixtures";

/**
 * mock 저장소를 쓰는 관리자 목록 화면의 데이터 주도 스모크.
 *
 * 화면마다 spec 을 복제하면 `workers: 1` 환경에서 실행 시간이 배로 늘어나므로,
 * 경로·제목 표를 순회하며 공통 흐름(렌더 → 공개 토글 → 새로고침 유지 → 삭제)을 확인한다.
 * 블로그 목록은 정렬 훅이 달라 `dev-articles.e2e.ts` 가 따로 다룬다.
 */
const LIST_SCREENS = [
  { path: "/admin/photos", heading: "사진", firstTitle: "새벽의 항구" },
  { path: "/admin/albums", heading: "앨범", firstTitle: "도시의 밤" },
  { path: "/admin/music/works", heading: "연주", firstTitle: "겨울 나그네" },
  { path: "/admin/music/awards", heading: "수상" },
  { path: "/admin/music/media", heading: "영상" },
  { path: "/admin/dev/projects", heading: "프로젝트" },
] as const;

/** 목록 행 — 공개/비공개 토글 배지를 가진 li 만 센다. */
const rows = (page: Page) =>
  page.locator("li").filter({ has: page.getByRole("button", { name: /^(공개|비공개)$/ }) });

test.describe("Admin · mock 목록 스모크", () => {
  // 관리자 화면에는 모바일 레이아웃 요구사항이 없다. 데스크톱 뷰포트에서만 돌린다.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "데스크톱 전용 화면");

  test.beforeEach(async ({ page }) => {
    await resetAdminStorage(page);
    // 행 삭제는 window.confirm 을 거친다 — 자동 수락.
    page.on("dialog", (dialog) => dialog.accept());
  });

  for (const screen of LIST_SCREENS) {
    test(`${screen.path} — 렌더 · 공개 토글 유지 · 삭제`, async ({ page }) => {
      // dev 서버가 각 화면을 처음 컴파일하는 시간을 담는다.
      test.setTimeout(90_000);
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { name: screen.heading, level: 1 })).toBeVisible();

      const list = rows(page);
      await expect(list.first()).toBeVisible({ timeout: 30_000 });
      const seeded = await list.count();
      expect(seeded).toBeGreaterThan(0);
      if ("firstTitle" in screen) {
        await expect(list.first()).toContainText(screen.firstTitle);
      }

      // 공개 토글이 로컬 저장소에 남아 새로고침에도 유지된다.
      const badge = list.first().getByRole("button", { name: /^(공개|비공개)$/ });
      const before = await badge.textContent();
      await badge.click();
      await expect(badge).not.toHaveText(before ?? "");
      const after = await badge.textContent();

      await page.reload();
      await expect(list.first()).toBeVisible({ timeout: 30_000 });
      await expect(list.first().getByRole("button", { name: /^(공개|비공개)$/ })).toHaveText(
        after ?? "",
      );

      // 삭제도 저장소를 거쳐 새로고침 후에도 줄어든 개수가 유지된다.
      await list.first().getByRole("button", { name: "삭제" }).click();
      await expect(list).toHaveCount(seeded - 1);

      await page.reload();
      await expect(list.first()).toBeVisible({ timeout: 30_000 });
      await expect(list).toHaveCount(seeded - 1);
    });
  }

  test("사진 목록 — 드래그 정렬이 새로고침 후에도 유지된다", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/admin/photos");

    const list = rows(page);
    await expect(list.first()).toBeVisible({ timeout: 30_000 });
    const firstTitle = await list.nth(0).locator('[class*="title"]').textContent();
    const secondTitle = await list.nth(1).locator('[class*="title"]').textContent();

    // dnd-kit PointerSensor(distance 4px) — 핸들을 누른 채 두 번째 행 중앙으로 끈다.
    const handle = list.nth(0).getByRole("button", { name: "순서 이동" });
    const target = list.nth(1);
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("드래그 대상 위치를 읽지 못했다.");

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2 + 4, { steps: 12 });
    await page.mouse.up();

    await expect(list.nth(0)).toContainText(secondTitle ?? "");
    await expect(list.nth(1)).toContainText(firstTitle ?? "");

    await page.reload();
    await expect(list.first()).toBeVisible({ timeout: 30_000 });
    await expect(list.nth(0)).toContainText(secondTitle ?? "");
    await expect(list.nth(1)).toContainText(firstTitle ?? "");
  });
});
