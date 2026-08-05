import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const openChat = async (page: Page, label: string | RegExp = /챗봇 열기/) => {
  await page.getByRole("button", { name: label }).click();
  await expect(page.getByRole("dialog", { name: "Ask Sungjoon." })).toBeVisible();
};

const submit = async (page: Page, message: string, inputName: string | RegExp = "메시지") => {
  const input = page.getByRole("textbox", { name: inputName });
  await input.fill(message);
  await input.press("Enter");
};

const chatMessages = (page: Page) => page.locator("#chat-message-scroll-container");

test.describe("Chat", () => {
  test("모바일 키보드가 열리면 문서를 이동하지 않고 패널 높이만 줄인다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "모바일 viewport에서만 검증");
    await page.addInitScript(() => {
      const viewport = new EventTarget();
      Object.defineProperties(viewport, {
        height: { configurable: true, value: 844, writable: true },
        offsetTop: { configurable: true, value: 0, writable: true },
      });
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: viewport,
      });
    });
    await page.goto("/ko");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      "content",
      /interactive-widget=resizes-content/,
    );
    const initialScrollY = await page.evaluate(() => {
      window.scrollTo(0, Math.min(300, document.documentElement.scrollHeight - innerHeight));
      return window.scrollY;
    });
    await openChat(page);

    const textarea = page.getByRole("textbox", { name: "메시지" });
    await expect(textarea).toHaveCSS("font-size", "16px");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.overflow))
      .toBe("hidden");
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
    const backplate = await page.locator("[data-chat-overlay]").evaluate((element) => {
      const style = getComputedStyle(element, "::before");
      return {
        content: style.content,
        position: style.position,
        background: style.backgroundColor,
      };
    });
    expect(backplate.content).not.toBe("none");
    expect(backplate.position).toBe("fixed");
    expect(backplate.background).not.toBe("rgba(0, 0, 0, 0)");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await chatMessages(page).evaluate((element) => {
      const filler = document.createElement("div");
      filler.style.height = "600px";
      filler.style.flex = "none";
      element.append(filler);
      element.scrollTop = element.scrollHeight;
    });
    await expect
      .poll(() =>
        chatMessages(page).evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(1);

    await page.evaluate(() => {
      const viewport = window.visualViewport as VisualViewport & { height: number };
      viewport.height = 480;
      const overlay = document.querySelector<HTMLElement>("[data-chat-overlay]");
      document.documentElement.style.height = "480px";
      document.body.style.height = "480px";
      overlay?.style.setProperty("--chat-viewport-height", "480px");
      void document.documentElement.offsetHeight;
      viewport.dispatchEvent(new Event("resize"));
    });

    const overlay = page.locator("[data-chat-overlay]");
    await expect(overlay).toHaveCSS("height", "480px");
    await expect(overlay).toHaveCSS("position", "absolute");
    await expect
      .poll(() =>
        page.evaluate(() => ({
          root: document.documentElement.style.height,
          body: document.body.style.height,
          scrollY: window.scrollY,
        })),
      )
      .toEqual({ root: "480px", body: "480px", scrollY: 0 });
    await expect
      .poll(() =>
        chatMessages(page).evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(1);
    const inlineViewportOverrides = await overlay.evaluate((element) => {
      const style = (element as HTMLElement).style;
      return {
        top: style.getPropertyValue("--chat-viewport-top"),
        height: style.getPropertyValue("--chat-viewport-height"),
      };
    });
    expect(inlineViewportOverrides).toEqual({ top: "", height: "480px" });
    const panel = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await panel.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
    const panelBox = await panel.boundingBox();
    expect(panelBox?.height).toBeCloseTo(480, -1);
    expect(panelBox?.y).toBeCloseTo(0, -1);
    await expect(panel).toHaveCSS("box-shadow", "none");

    await page.evaluate(() => {
      const viewport = window.visualViewport as VisualViewport & { height: number };
      viewport.height = 820;
      viewport.dispatchEvent(new Event("scroll"));
    });
    await expect(overlay).toHaveCSS("height", "844px");
    await expect
      .poll(() =>
        page.evaluate(() => ({
          root: document.documentElement.style.height,
          body: document.body.style.height,
        })),
      )
      .toEqual({ root: "844px", body: "844px" });
    await expect
      .poll(() =>
        chatMessages(page).evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
        ),
      )
      .toBeLessThanOrEqual(1);

    await panel.getByRole("button", { name: "챗봇 닫기" }).click();
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
    await expect
      .poll(() =>
        page.evaluate(() => ({
          root: document.documentElement.style.height,
          body: document.body.style.height,
        })),
      )
      .toEqual({ root: "", body: "" });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScrollY);
  });

  test("패널을 닫았다 열어도 새로고침 전까지 대화를 유지한다", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/chat", async (route) => {
      requests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: { role: "assistant", content: "이 답변은 패널을 닫아도 유지됩니다." },
        }),
      });
    });
    await page.goto("/ko");

    await openChat(page);
    await expect(page.getByRole("button", { name: "챗봇 닫기" })).toHaveCount(1);
    await expect(page.getByText("민감한 개인정보는 입력하지 마세요.")).toBeVisible();
    await submit(page, "대화를 기억해 줘");
    await expect(chatMessages(page).getByText("이 답변은 패널을 닫아도 유지됩니다.")).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await dialog.getByRole("button", { name: "챗봇 닫기" }).click();
    await expect(dialog).toBeHidden();

    await openChat(page);
    await expect(chatMessages(page).getByText("대화를 기억해 줘")).toBeVisible();
    await expect(chatMessages(page).getByText("이 답변은 패널을 닫아도 유지됩니다.")).toBeVisible();
    expect(requests).toBe(1);
  });

  test("콘텐츠 카드를 클릭하면 챗봇을 닫고 기존 사진 모달을 연다", async ({ page }) => {
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: {
            role: "assistant",
            content: "이 사진부터 확인해 보세요.",
            references: [
              {
                type: "photo",
                id: "p01",
                title: "새벽의 항구",
                subtitle: "도쿄 미나토구",
                href: "/photo?photo=p01",
                image: {
                  url: "/design-samples/tone01.png",
                  width: 1600,
                  height: 2000,
                },
              },
            ],
          },
        }),
      }),
    );
    await page.goto("/ko");

    await openChat(page);
    await submit(page, "사진을 보여줘");
    await page.getByRole("link", { name: "새벽의 항구 — 도쿄 미나토구" }).click();

    await expect(page).toHaveURL(/\/ko\/photo\?photo=p01$/);
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();
  });

  test("영어 설정을 API 요청과 오류 없는 접근성 트리에 반영한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "axe 스캔은 데스크톱 DOM에서 대표 실행");
    let requestedLang = "";
    await page.route("**/api/chat", async (route) => {
      requestedLang = route.request().postDataJSON().lang;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: { role: "assistant", content: "This is an English response." },
        }),
      });
    });
    // 경로 기반 i18n — 영어는 /en 경로가 단일 출처 (localStorage 설정은 공개 트리에 영향 없음)
    await page.goto("/en");
    await page.evaluate(() => window.scrollTo(0, 300));

    await openChat(page, "Open chat");
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
    const siteHeader = page.locator("[data-site-header]");
    await expect(siteHeader).toBeVisible();
    await expect(siteHeader).toHaveCSS("opacity", "1");
    await expect.poll(async () => (await siteHeader.boundingBox())?.y).toBeCloseTo(0, 0);
    const desktopBackplate = await page
      .locator("[data-chat-overlay]")
      .evaluate((element) => getComputedStyle(element, "::before").content);
    expect(desktopBackplate).toBe("none");
    const customScrollbar = page.locator("[data-custom-scrollbar-ui]");
    await expect(customScrollbar).toHaveAttribute("aria-controls", "chat-message-scroll-container");
    await expect(customScrollbar).toHaveAttribute("data-visible", "false");
    await expect(
      page.getByText("Please don’t share sensitive personal information."),
    ).toBeVisible();
    await submit(page, "Tell me about this portfolio", "Message");
    await expect(chatMessages(page).getByText("This is an English response.")).toBeVisible();
    expect(requestedLang).toBe("en");
    await expect(page.locator("#page-content")).toHaveAttribute("inert", "");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
