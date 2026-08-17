import { expect, test } from "@playwright/test";

const LIST = "/ko/dev/articles";

test.describe("개발 블로그 목록", () => {
  // URL 계약은 뷰포트와 무관하므로 데스크톱에서 한 번만 확인한다(workers: 1).
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "목록 URL 계약은 데스크톱에서 검증");
  });

  test("태그 필터가 결과와 주소를 함께 바꾸고 뒤로가기로 돌아온다", async ({ page }) => {
    await page.goto(LIST);
    const count = page.locator("main").getByText(/\d+ articles/);
    await expect(count).toHaveText("9 articles");

    await page.getByRole("button", { name: "Firebase", exact: true }).click();
    await expect(page).toHaveURL(/\?tag=firebase$/);
    await expect(count).toHaveText("3 articles");

    // 새로고침해도 같은 화면이어야 공유한 링크가 뜻을 갖는다.
    await page.reload();
    await expect(count).toHaveText("3 articles");

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
    await expect(count).toHaveText("9 articles");
  });

  test("보기 전환이 주소에 남는다", async ({ page }) => {
    await page.goto(LIST);
    await page.getByRole("button", { name: "목록" }).click();

    await expect(page).toHaveURL(/\?view=list$/);
    await expect(page.getByRole("button", { name: "목록" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.goBack();
    await expect(page.getByRole("button", { name: "그리드" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("페이지를 넘기면 다른 글이 나오고 뒤로가기로 1페이지에 돌아온다", async ({ page }) => {
    await page.goto(LIST);
    await expect(
      page.getByRole("heading", { name: "캐시 태그를 콘텐츠 종류로 나눈다" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "2페이지" }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(
      page.getByRole("heading", { name: "이미지를 세 벌로 저장하는 이유" }),
    ).toBeVisible();

    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "캐시 태그를 콘텐츠 종류로 나눈다" }),
    ).toBeVisible();
  });

  test("범위 밖 페이지와 없는 태그는 주소를 정규화한다", async ({ page }) => {
    await page.goto(`${LIST}?page=99`);
    await expect(page).toHaveURL(/\?page=2$/);

    await page.goto(`${LIST}?tag=does-not-exist`);
    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
    await expect(page.locator("main").getByText(/\d+ articles/)).toHaveText("9 articles");
  });

  test("결과가 없는 태그는 선택한 태그와 초기화를 함께 보여 준다", async ({ page }) => {
    await page.goto(`${LIST}?tag=accessibility`);

    await expect(page.getByText("이 태그로 발행한 글이 아직 없습니다")).toBeVisible();
    await page.getByRole("button", { name: /접근성.*초기화/ }).click();

    await expect(page).toHaveURL(new RegExp(`${LIST}$`));
    await expect(page.locator("main").getByText(/\d+ articles/)).toHaveText("9 articles");
  });

  test("카드에서 상세로 이동한다", async ({ page }) => {
    await page.goto(LIST);
    // 이 글은 고정이라 위 섹션과 아래 목록에 각각 한 번씩 있다.
    await page
      .getByRole("link", { name: /서버 없이 포트폴리오를 운영한다/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/ko\/dev\/articles\/serverless-portfolio$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "서버 없이 포트폴리오를 운영한다",
    );
  });
});

const PINNED_TITLE = /서버 없이 포트폴리오를 운영한다/;

test.describe("개발 블로그 고정 글", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "고정 섹션 계약은 데스크톱에서 검증");
  });

  test("페이지를 넘겨도 고정 섹션이 남는다", async ({ page }) => {
    const section = page.getByRole("region", { name: "고정된 글" });
    await page.goto(LIST);
    await expect(section.getByRole("link", { name: PINNED_TITLE })).toBeVisible();

    await page.getByRole("button", { name: "2페이지" }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(section.getByRole("link", { name: PINNED_TITLE })).toBeVisible();
  });

  test("고정 글은 아래 목록에도 발행일 자리에 남는다", async ({ page }) => {
    await page.goto(LIST);

    // 섹션 1 + 목록 1. 고정해도 목록에서 사라지지 않아 페이지 경계가 그대로다.
    await expect(page.getByRole("link", { name: PINNED_TITLE })).toHaveCount(2);
    await expect(page.locator("main").getByText(/\d+ articles/)).toHaveText("9 articles");
  });

  test("태그를 고르면 고정 섹션을 숨긴다", async ({ page }) => {
    // firebase 는 고정 글이 가진 태그다. 그래도 섹션은 뜨지 않고 목록에만 남는다.
    await page.goto(`${LIST}?tag=firebase`);

    await expect(page.getByRole("region", { name: "고정된 글" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: PINNED_TITLE })).toHaveCount(1);
  });
});
