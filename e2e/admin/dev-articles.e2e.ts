import { expect, test } from "@playwright/test";

import { resetAdminStorage } from "../utils/admin-fixtures";

/**
 * 관리자 블로그 작성 흐름. 로컬 저장소를 Firestore 대신 쓰는 mock 단계를 검증한다.
 * 인증은 `NEXT_PUBLIC_ADMIN_TEST_SESSION` 으로 열린다(비-프로덕션 전용).
 */
const BODY = [
  "## 첫 번째 문단",
  "",
  "서버 없이 굴리는 포트폴리오의 구조를 정리한다.",
  "",
  "```ts",
  "const cost = 0;",
  "```",
].join("\n");

test.describe("Admin · 블로그", () => {
  // 관리자 화면에는 모바일 레이아웃 요구사항이 없다. 데스크톱 뷰포트에서만 돌린다.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 900, "데스크톱 전용 화면");

  test.beforeEach(async ({ page }) => {
    await resetAdminStorage(page);
  });

  test("작성 → 로컬 복구 → 저장 → 전체 미리보기 → 발행", async ({ page }) => {
    // 자동 저장 대기(5초) + dev 서버가 미리보기 라우트를 처음 컴파일하는 시간까지 담는다.
    test.setTimeout(120_000);
    await page.goto("/admin/dev/articles");
    await expect(page.getByRole("heading", { name: "블로그", level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "+ 새 글" }).click();
    // dev 서버가 편집 라우트를 처음 컴파일하는 시간을 담는다.
    await expect(page.getByRole("heading", { name: "새 글" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("제목 (한국어)").fill("E2E 작성 흐름");
    await page.getByLabel("제목 (English)").fill("E2E writing flow");
    // 주소는 영어 제목을 따라 자동으로 제안된다.
    await expect(page.getByLabel("주소 (slug)")).toHaveValue("e2e-writing-flow");

    await page.getByLabel("요약 (한국어)").fill("작성부터 발행까지 확인한다.");
    await page.getByLabel("요약 (English)").fill("From draft to publish.");
    await page.getByLabel("발행일").fill("2026-08-12T09:00");
    await page.getByLabel("본문 Markdown").fill(BODY);

    // 입력이 멈추면 복구본을 뜬다. 새로고침해도 값이 살아 있어야 한다.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Object.keys(window.localStorage).some((key) =>
              key.startsWith("ap-admin-dev-article-draft:"),
            ),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.reload();
    await page.getByRole("button", { name: "복구하기" }).click();
    await expect(page.getByLabel("본문 Markdown")).toHaveValue(BODY);

    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/admin\/dev\/articles\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "글 수정" })).toBeVisible();

    // 미리보기는 새 탭에서 열리고 편집 화면은 그대로 남는다.
    const [preview] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: "전체 미리보기" }).click(),
    ]);
    await expect(preview).toHaveURL(new RegExp("/preview$"), { timeout: 60_000 });
    await expect(preview.getByRole("heading", { name: "E2E 작성 흐름", level: 1 })).toBeVisible();
    // 본문 코드 블록이 서버 색칠을 거쳐 그려진다.
    await expect(preview.locator("pre code span").first()).toBeVisible();
    await preview.close();

    await expect(page.getByRole("heading", { name: "글 수정" })).toBeVisible();
    await page.getByLabel("발행", { exact: true }).check();
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장하지 않은 변경")).toBeHidden();

    await page.getByRole("button", { name: "취소" }).click();
    const row = page.getByRole("listitem").filter({ hasText: "E2E 작성 흐름" });
    await expect(row.getByRole("button", { name: "공개" })).toBeVisible();
  });

  test("취소는 복구본과 이 탭이 잡아 둔 새 글 ID를 함께 버린다", async ({ page }) => {
    await page.goto("/admin/dev/articles/new");
    await expect(page.getByRole("heading", { name: "새 글" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("제목 (한국어)").fill("버릴 글");
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Object.keys(window.localStorage).some((key) =>
              key.startsWith("ap-admin-dev-article-draft:"),
            ),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    // 저장하지 않은 변경이 있으므로 확인창이 뜬다.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "취소" }).click();
    await expect(page).toHaveURL(new RegExp("/admin/dev/articles$"));

    const leftover = await page.evaluate(() => ({
      drafts: Object.keys(window.localStorage).filter((key) =>
        key.startsWith("ap-admin-dev-article-draft:"),
      ),
      newId: window.sessionStorage.getItem("ap-admin-dev-article-new:v1"),
    }));
    expect(leftover.drafts).toEqual([]);
    expect(leftover.newId).toBeNull();

    // 다시 새 글을 열어도 버린 편집본이 복구 후보로 뜨지 않는다.
    await page.getByRole("link", { name: "+ 새 글" }).click();
    await expect(page.getByRole("heading", { name: "새 글" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("저장하지 않은 편집본이 있습니다")).toBeHidden();
  });

  test("발행 조건을 만족하지 않으면 발행할 수 없다", async ({ page }) => {
    await page.goto("/admin/dev/articles/new");

    await page.getByLabel("제목 (한국어)").fill("영어 제목이 없는 글");
    await page.getByLabel("본문 Markdown").fill("본문만 있다.");
    await page.getByLabel("발행", { exact: true }).check();

    await expect(page.getByText("한국어와 영어 제목을 모두 입력하세요.")).toBeVisible();
    await expect(page.getByText("발행일을 지정하세요. 목록 정렬 기준입니다.")).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  test("이미지는 인라인 입력에서 대체 텍스트를 받아 본문에 들어간다", async ({ page }) => {
    await page.goto("/admin/dev/articles/new");

    // window.prompt 는 iOS Safari 가 사진 선택기 이후에 표시하지 않아 쓸 수 없다.
    // 파일을 고르면 인라인 입력이 열리고, 대체 텍스트 없이는 삽입 버튼이 잠긴다.
    // 폼에는 대표 이미지 파일 입력도 있어 본문 편집기 영역으로 좁힌다.
    const editor = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "본문 (한국어 원문)" }) });
    await editor.locator('input[type="file"]').setInputFiles({
      name: "diagram.png",
      mimeType: "image/png",
      buffer: Buffer.from("89504e470d0a1a0a", "hex"),
    });

    const altInput = page.getByPlaceholder("이미지에 무엇이 있는지 적습니다");
    await expect(altInput).toBeVisible();
    await expect(page.getByRole("button", { name: "본문에 넣기" })).toBeDisabled();

    await altInput.fill("구조 다이어그램");
    await page.getByRole("button", { name: "본문에 넣기" }).click();

    await expect(page.getByLabel("본문 Markdown")).toHaveValue(/!\[구조 다이어그램\]\(https:\/\//);
    await expect(altInput).toBeHidden();
  });

  test("허용하지 않은 본문은 미리보기가 위치와 함께 알려 준다", async ({ page }) => {
    await page.goto("/admin/dev/articles/new");

    await page.getByLabel("본문 Markdown").fill("첫 줄\n\n[클릭](javascript:alert(1))");
    await page.getByRole("button", { name: "미리보기" }).click();

    await expect(page.getByText(/3번째 줄 — 링크는 https/)).toBeVisible();
  });

  test("태그 사전에서 추가·수정하고 사용 중 태그는 지울 수 없다", async ({ page }) => {
    await page.goto("/admin/dev/articles");
    const panel = page.getByRole("region", { name: "태그 관리" });
    await expect(panel.getByRole("heading", { name: "태그 관리" })).toBeVisible();

    // 영어 라벨로 태그 ID를 만든다.
    await panel.getByLabel("새 태그 (한국어)").fill("웹엠시피");
    await panel.getByLabel("새 태그 (English)").fill("WebMCP");
    await expect(panel.getByText("저장할 id: webmcp")).toBeVisible();
    await panel.getByRole("button", { name: "+ 태그 추가" }).click();

    const row = panel.getByRole("listitem").filter({ hasText: "webmcp" });
    await expect(row.getByText("0건 사용")).toBeVisible();

    // 저장한 라벨은 새로고침 후에도 유지된다.
    await row.getByLabel("한국어 라벨").fill("웹 MCP");
    await row.getByRole("button", { name: "저장" }).click();
    await expect(row.getByRole("button", { name: "저장" })).toBeDisabled();
    await page.reload();
    await expect(
      panel.getByRole("listitem").filter({ hasText: "webmcp" }).getByLabel("한국어 라벨"),
    ).toHaveValue("웹 MCP");

    // 글에서 사용 중인 태그는 삭제할 수 없다.
    await expect(
      panel
        .getByRole("listitem")
        .filter({ hasText: "firebase" })
        .getByRole("button", { name: "삭제" }),
    ).toBeDisabled();

    // 사용하지 않는 태그는 삭제할 수 있다.
    page.once("dialog", (dialog) => void dialog.accept());
    await panel
      .getByRole("listitem")
      .filter({ hasText: "webmcp" })
      .getByRole("button", { name: "삭제" })
      .click();
    await expect(panel.getByRole("listitem").filter({ hasText: "webmcp" })).toHaveCount(0);
  });

  test("초안은 목록 위에 오고 상태 필터로 나눌 수 있다", async ({ page }) => {
    await page.goto("/admin/dev/articles");

    const firstRow = page.getByRole("listitem").first();
    await expect(firstRow.getByRole("button", { name: "초안" })).toBeVisible();

    await page
      .getByRole("group", { name: "상태 필터" })
      .getByRole("button", { name: "공개" })
      .click();
    await expect(page.getByRole("listitem").getByRole("button", { name: "초안" })).toHaveCount(0);
  });
});
