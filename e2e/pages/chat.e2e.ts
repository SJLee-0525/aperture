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

test.describe("Chat", () => {
  test("모바일 키보드가 열리면 visual viewport 높이에 맞춰 패널을 줄인다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "모바일 visual viewport에서만 검증");
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
    await page.goto("/");
    await openChat(page);

    await page.evaluate(() => {
      const viewport = window.visualViewport as VisualViewport & {
        height: number;
        offsetTop: number;
      };
      viewport.height = 480;
      viewport.offsetTop = 12;
      viewport.dispatchEvent(new Event("resize"));
    });

    const overlay = page.locator("[data-chat-overlay]");
    await expect(overlay).toHaveCSS("height", "480px");
    await expect(overlay).toHaveCSS("top", "12px");
    const panelBox = await page.getByRole("dialog", { name: "Ask Sungjoon." }).boundingBox();
    expect(panelBox?.height).toBeCloseTo(480, -1);
    expect(panelBox?.y).toBeCloseTo(12, -1);
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
    await page.goto("/");

    await openChat(page);
    await expect(page.getByRole("button", { name: "챗봇 닫기" })).toHaveCount(1);
    await expect(page.getByText("민감한 개인정보는 입력하지 마세요.")).toBeVisible();
    await submit(page, "대화를 기억해 줘");
    await expect(page.getByText("이 답변은 패널을 닫아도 유지됩니다.")).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await dialog.getByRole("button", { name: "챗봇 닫기" }).click();
    await expect(dialog).toBeHidden();

    await openChat(page);
    await expect(page.getByText("대화를 기억해 줘")).toBeVisible();
    await expect(page.getByText("이 답변은 패널을 닫아도 유지됩니다.")).toBeVisible();
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
    await page.goto("/");

    await openChat(page);
    await submit(page, "사진을 보여줘");
    await page.getByRole("link", { name: "새벽의 항구 — 도쿄 미나토구" }).click();

    await expect(page).toHaveURL(/\/photo\?photo=p01$/);
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();
  });

  test("영어 설정을 API 요청과 오류 없는 접근성 트리에 반영한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "axe 스캔은 데스크톱 DOM에서 대표 실행");
    let requestedLang = "";
    await page.addInitScript(() => localStorage.setItem("ap-lang:v1", "en"));
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
    await page.goto("/");

    await openChat(page, "Open chat");
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    const customScrollbar = page.locator("[data-custom-scrollbar-ui]");
    await expect(customScrollbar).toHaveAttribute("aria-controls", "chat-message-scroll-container");
    await expect(customScrollbar).toHaveAttribute("data-visible", "false");
    await expect(
      page.getByText("Please don’t share sensitive personal information."),
    ).toBeVisible();
    await submit(page, "Tell me about this portfolio", "Message");
    await expect(page.getByText("This is an English response.")).toBeVisible();
    expect(requestedLang).toBe("en");
    await expect(page.locator("#page-content")).toHaveAttribute("inert", "");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
