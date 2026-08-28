import { expect, test } from "@playwright/test";

import { settleImages } from "../utils/settle-images";

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

  test("제목 여러 개를 건너뛰어도 현재 항목 표시가 따라온다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover 확장은 포인터가 있는 환경 전용");

    await page.goto(ARTICLE);
    await settleImages(page);

    /** 한 프레임에 제목 여러 개를 건너뛰는 이동. */
    const jumpTo = async (heading: string) => {
      const top = await page
        .getByRole("heading", { name: heading, exact: true })
        .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
      await page.evaluate((y) => window.scrollTo(0, y), top - 40);
    };

    await jumpTo("남은 일");
    await page.getByRole("button", { name: "목차 열기" }).hover();
    await expect(page.getByRole("button", { name: "남은 일" })).toHaveAttribute(
      "aria-current",
      "location",
    );

    // 위로 크게 되돌아간다. 교차 상태 변화로만 판정하면 표시가 아래 항목에 멈춘다.
    await jumpTo("보안 경계는 Rules 하나");
    await expect(page.getByRole("button", { name: "보안 경계는 Rules 하나" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    await expect(page.getByRole("button", { name: "남은 일" })).not.toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  test("hover 로 목차를 펼치고 항목으로 이동한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover 확장은 포인터가 있는 환경 전용");

    await page.goto(ARTICLE);
    // 이미지 로드로 제목 위치가 바뀌지 않도록 본문 높이를 먼저 고정한다.
    await settleImages(page);
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

  test("목차가 길면 잘리지 않고 공용 스크롤로 넘긴다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "hover 확장은 포인터가 있는 환경 전용");

    // 세로가 짧은 창이면 목차 최대 높이가 작아져 항목이 넘친다.
    await page.setViewportSize({ width: 1440, height: 460 });
    await page.goto(ARTICLE);
    await settleImages(page);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.getByRole("button", { name: "목차 열기" }).hover();

    const list = page.locator("nav[data-custom-scroll-container]");
    await expect(list).toBeVisible();
    const metrics = await list.evaluate((node) => ({
      overflows: node.scrollHeight > node.clientHeight,
      bottom: node.getBoundingClientRect().bottom,
    }));

    // 넘치는데도 스크롤되지 않으면 아래 항목이 그대로 잘린다.
    expect(metrics.overflows).toBe(true);
    expect(metrics.bottom).toBeLessThanOrEqual(460);

    await list.evaluate((node) => node.scrollTo(0, node.scrollHeight));
    expect(await list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);

    // 막대는 저장소 공용 CustomScrollbar 가 그린다 — 스코프가 목록으로 바뀐다.
    await expect(page.locator("[data-custom-scrollbar-ui]")).toHaveAttribute(
      "data-scroll-scope",
      "local",
    );
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
    // 대체 이미지가 늦게 표시돼도 제목 위치가 바뀌지 않도록 높이를 먼저 고정한다.
    await settleImages(page);
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

  test("다른 글 표는 행 어디를 눌러도 그 글로 간다", async ({ page }) => {
    await page.goto(ARTICLE);

    // 어느 글이 같은 쪽에 오는지는 발행일 순서에 달렸으므로 표의 첫 링크를 쓴다.
    const table = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "다른 글" }) });
    const row = table.getByRole("link").first();
    const href = await row.getAttribute("href");
    if (!href) throw new Error("다른 글 표의 행에 주소가 없다");

    // 링크가 행 전체를 덮는지 확인하려고 제목 밖의 날짜 영역을 누른다.
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    if (!box) throw new Error("다른 글 표의 행을 찾지 못했다");
    await row.click({ position: { x: box.width - 24, y: box.height / 2 } });

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("현재 글 행은 hover 로 밀리지 않는다", async ({ page }) => {
    await page.goto(ARTICLE);

    // 이 행은 링크가 아니라 현재 위치 표시다. hover 배경이 다시 깔리면 두 상태를 구분할 수 없다.
    // 셸 내비도 현재 위치에 aria-current 를 붙이므로 표 안으로 범위를 좁힌다.
    const table = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "다른 글" }) });
    const current = table.locator('[aria-current="page"]');
    const before = await current.evaluate((element) => getComputedStyle(element).paddingLeft);
    await current.hover();
    await expect
      .poll(() => current.evaluate((element) => getComputedStyle(element).paddingLeft))
      .toBe(before);
  });

  test("본문 이미지를 눌러 크게 보고 다음 이미지로 넘긴다", async ({ page }) => {
    await page.goto(ARTICLE);

    const zoom = page.getByRole("button", { name: /크게 보기/ });
    await expect(zoom.first()).toBeAttached();
    await zoom.first().scrollIntoViewIfNeeded();
    await zoom.first().click();

    const lightbox = page.getByRole("dialog");
    await expect(lightbox).toBeVisible();

    // 이 글에는 이미지가 둘 이상이라 앞뒤로 넘길 수 있어야 한다.
    await lightbox.getByRole("button", { name: "다음 이미지" }).click();
    await expect(lightbox).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(lightbox).toBeHidden();
  });

  /**
   * 포커스 트랩이 가시성을 offsetParent 로 판정하면 fixed 요소가 전부 빠진다.
   * 라이트박스의 닫기·이전·다음 버튼이 모두 fixed 라, 그때 Tab 은 스크림 하나만
   * 오가고 키보드 사용자는 어떤 버튼에도 닿지 못한다(BUG-C-02).
   *
   * jsdom 에는 레이아웃이 없어 getClientRects 가 늘 비어 있다. 이 결함은 실제 브라우저
   * 에서만 재현되므로 단위 테스트가 아니라 여기서 고정한다.
   *
   * 양 끝의 이동 버튼도 aria-disabled 로 탭 순서에 남는다. 이동 직후 버튼이 잠겨도
   * 포커스가 body 로 빠지지 않아야 컨테이너의 keydown 트랩이 계속 동작한다.
   */
  test("라이트박스 안에서 Tab 이 fixed 버튼들에 닿는다", async ({ page }) => {
    await page.goto(ARTICLE);

    const zoom = page.getByRole("button", { name: /크게 보기/ });
    await expect(zoom.first()).toBeAttached();
    const lightbox = page.getByRole("dialog");

    /** 트랩이 순환하므로 한 바퀴 안에 나오는 라벨을 모은다. */
    const tabThroughTrap = async (): Promise<string[]> => {
      const labels = new Set<string>();
      for (let step = 0; step < 8; step += 1) {
        await page.keyboard.press("Tab");
        const label = await page.evaluate(
          () => document.activeElement?.getAttribute("aria-label") ?? "",
        );
        if (label) labels.add(label);
      }
      return [...labels];
    };

    await zoom.first().scrollIntoViewIfNeeded();
    await zoom.first().click();
    await expect(lightbox).toBeVisible();

    const labels = await tabThroughTrap();
    expect(labels).toEqual(expect.arrayContaining(["닫기", "이전 이미지", "다음 이미지"]));

    const next = lightbox.getByRole("button", { name: "다음 이미지" });
    await next.click();
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(next).toBeFocused();

    await page.keyboard.press("Tab");
    await expect
      .poll(() => lightbox.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);
  });

  // 프리렌더 목록 밖 경로는 요청-시 렌더되고, 그 응답의 상태 코드는 스트리밍이 시작된 뒤라
  // 200 으로 남는다. 계약은 상태 코드가 아니라 "내용이 보이지 않고 색인되지 않는다" 로 고정한다.
  test("없는 slug 는 404 화면을 보여주고 색인을 막는다", async ({ page }) => {
    await page.goto("/ko/dev/articles/does-not-exist");

    await expect(page.getByRole("heading", { name: /찾을 수 없습니다/ })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });

  test("초안은 제목도 본문도 노출되지 않는다", async ({ page }) => {
    await page.goto("/ko/dev/articles/rag-chunking-draft");

    await expect(page.getByRole("heading", { name: /찾을 수 없습니다/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("긴 글을 어떤 단위로 잘라 임베딩할까");
    await expect(page.locator("body")).not.toContainText("문단 단위로 자를 때");
  });
});
