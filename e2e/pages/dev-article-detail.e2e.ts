import { expect, test } from "@playwright/test";

const ARTICLE = "/ko/dev/articles/serverless-portfolio";

test.describe("개발 블로그 상세", () => {
  test("본문 구간에서만 목차 인디케이터가 나타난다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover 확장은 포인터가 있는 환경 전용");

    await page.goto(ARTICLE);
    const rail = page.getByRole("button", { name: "목차 열기" });

    // 히어로를 읽는 동안에는 아직 옮겨 다닐 곳이 없다.
    await expect(rail).not.toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(rail).toBeVisible();
  });

  test("hover 로 목차를 펼치고 항목으로 이동한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover 확장은 포인터가 있는 환경 전용");

    await page.goto(ARTICLE);
    await page.evaluate(() => window.scrollTo(0, 1000));

    const rail = page.getByRole("button", { name: "목차 열기" });
    await rail.hover();
    await expect(rail).toHaveAttribute("aria-expanded", "true");

    const entry = page.getByRole("button", { name: "이미지 파이프라인" });
    await expect(entry).toBeVisible();
    await entry.click();

    await expect(page).toHaveURL(/#.+$/);
    // 고정 헤더(76px)에 가리지 않는 자리로 이동해야 한다. 부드러운 스크롤이 끝날 때까지 기다린다.
    await expect
      .poll(() =>
        page
          .getByRole("heading", { name: "이미지 파이프라인" })
          .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
      )
      .toBeLessThan(220);
    const top = await page
      .getByRole("heading", { name: "이미지 파이프라인" })
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(76);
  });

  test("모바일에서는 탭으로 목차 서랍을 열고 닫는다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "서랍은 손가락으로 쓰는 환경 전용");

    await page.goto(ARTICLE);
    await page.evaluate(() => window.scrollTo(0, 1000));

    await page.getByRole("button", { name: "목차 열기" }).click();
    const drawer = page.getByRole("dialog", { name: "목차" });
    await expect(drawer).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
  });

  test("모바일에서 목차 항목을 고르면 그 제목으로 이동한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "서랍은 손가락으로 쓰는 환경 전용");

    await page.goto(ARTICLE);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.getByRole("button", { name: "목차 열기" }).click();

    await page
      .getByRole("dialog", { name: "목차" })
      .getByRole("button", { name: "남은 일" })
      .click();

    await expect(page).toHaveURL(/#.+$/);
    // 배경 스크롤 잠금을 푸는 처리가 이동을 되돌리지 않아야 한다.
    await expect
      .poll(() =>
        page
          .getByRole("heading", { name: "남은 일" })
          .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
      )
      .toBeLessThan(220);
    const top = await page
      .getByRole("heading", { name: "남은 일" })
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(58);
  });

  test("하단에 연관 프로젝트와 다른 글 표가 있다", async ({ page }) => {
    await page.goto(ARTICLE);

    await expect(page.getByRole("heading", { name: "연관 프로젝트" })).toBeVisible();
    await expect(page.getByRole("link", { name: /개인 포트폴리오/ })).toBeVisible();

    await expect(page.getByRole("heading", { name: "다른 글" })).toBeVisible();
    // 현재 글은 링크가 아니라 현재 위치로 표시한다.
    await expect(page.getByText("서버 없이 포트폴리오를 운영한다").last()).toBeVisible();
  });

  test("없는 slug 는 404 다", async ({ page }) => {
    const response = await page.goto("/ko/dev/articles/does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("초안은 공개되지 않는다", async ({ page }) => {
    const response = await page.goto("/ko/dev/articles/rag-chunking-draft");
    expect(response?.status()).toBe(404);
  });
});
