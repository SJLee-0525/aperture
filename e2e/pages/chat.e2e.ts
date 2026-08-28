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

  test("모바일 프로젝트 모달 위에서 챗봇을 열면 최상위 잠금 정책을 적용한다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "모바일 viewport에서만 검증");
    await page.goto("/ko/dev/projects");
    // 인트로 스플래시(1.4s CSS 애니메이션)가 떠 있는 동안의 클릭은 스플래시에 가로막혀 재시도되고,
    // 그 사이 스크롤 위치가 흐트러진다(모드에 따라 -18px·-269px 처럼 제각각). 사람이 하는 순서대로
    // 화면이 자리 잡은 뒤에 스크롤한다.
    await expect(page.locator("[data-intro-splash]")).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 500));
    // 첫 카드는 이 스크롤 위치에서 화면 밖이라 클릭 대상으로 쓸 수 없다 — Playwright 가 클릭 전
    // 대상을 뷰포트로 끌어오면서 페이지를 되감아, 정작 검증하려던 스크롤 오프셋을 지운다.
    // 그 자리에서 이미 온전히 보이는 카드를 눌러야 사람이 하는 조작과 같아진다.
    const projectButton = page.getByRole("button", { name: /사진 포트폴리오/ });
    await expect(projectButton).toBeInViewport({ ratio: 1 });
    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(0);

    // hydration 전 합성 popstate가 유실되지 않도록 실제 사용자 경로로 모달을 연다.
    await projectButton.click();
    await expect(page.getByRole("dialog", { name: "사진 포트폴리오" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");
    // 잠금이 "아무 음수"가 아니라 잠글 당시의 스크롤 위치 그대로를 붙잡아야 닫은 뒤 제자리로 돌아온다.
    await expect
      .poll(() => page.evaluate(() => Number.parseFloat(document.body.style.top)))
      .toBeCloseTo(-scrolledY, 0);
    const projectScrollLockTop = await page.evaluate(() => document.body.style.top);

    await openChat(page);
    const chat = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
    await expect
      .poll(() => chat.evaluate((element) => element.getBoundingClientRect().top))
      .toBe(0);
    await expect(page.getByRole("textbox", { name: "메시지" })).toBeInViewport();

    await page.keyboard.press("Escape");
    await expect(chat).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");
    await expect
      .poll(() => page.evaluate(() => document.body.style.top))
      .toBe(projectScrollLockTop);
    await expect(page.getByRole("dialog", { name: "사진 포트폴리오" })).toBeVisible();
  });

  test("사진 모달 위 챗봇이 열린 동안 방향키와 Escape는 챗봇만 처리한다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "모바일 viewport에서만 검증");
    await page.goto("/ko/photo?photo=p01");
    const photoDialog = page.getByRole("dialog", { name: "새벽의 항구" });
    await expect(photoDialog).toBeVisible();

    await openChat(page);
    const chat = page.getByRole("dialog", { name: "Ask Sungjoon." });
    const input = page.getByRole("textbox", { name: "메시지" });
    await input.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/photo=p01/);

    await page.keyboard.press("Escape");
    await expect(chat).toBeHidden();
    await expect(photoDialog).toBeVisible();
    await expect(page).toHaveURL(/photo=p01/);
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

  test("열린 사진 모달을 화면 문맥으로 요청 본문에 실어 보낸다", async ({ page }) => {
    let context: unknown;
    await page.route("**/api/chat", async (route) => {
      context = route.request().postDataJSON().context;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: { role: "assistant", content: "도쿄 미나토구에서 찍은 사진이에요." },
        }),
      });
    });
    await page.goto("/ko/photo?photo=p01");
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();

    await openChat(page);
    await submit(page, "이 사진 어디서 찍었어?");

    await expect(chatMessages(page).getByLabel("함께 보낸 사진: 새벽의 항구")).toBeVisible();
    await expect(chatMessages(page).getByText("도쿄 미나토구에서 찍은 사진이에요.")).toBeVisible();
    expect(context).toEqual({
      pathname: "/ko/photo",
      openTarget: { type: "photo", id: "p01" },
    });

    await page.evaluate(() => {
      window.history.replaceState(window.history.state, "", "/ko/photo?photo=p02");
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    });
    await chatMessages(page).getByRole("link", { name: "함께 보낸 사진: 새벽의 항구" }).click();
    await expect(page).toHaveURL(/\/ko\/photo\?photo=p01$/);
    await expect(page.getByRole("dialog", { name: "Ask Sungjoon." })).toBeHidden();
  });

  test("앨범에서 연 사진도 화면 문맥으로 요청 본문에 실어 보낸다", async ({ page }) => {
    let context: unknown;
    await page.route("**/api/chat", async (route) => {
      context = route.request().postDataJSON().context;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: { role: "assistant", content: "앨범에서 고른 사진을 기준으로 답했어요." },
        }),
      });
    });
    await page.goto("/ko/photo/albums/city-night?photo=p01");
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();

    await openChat(page);
    const dialog = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await expect(dialog.getByText("보고 있는 사진")).toBeVisible();
    await expect(dialog.getByText("새벽의 항구", { exact: true })).toBeVisible();
    await submit(page, "이 사진 어디서 찍었어?");

    await expect(
      chatMessages(page).getByText("앨범에서 고른 사진을 기준으로 답했어요."),
    ).toBeVisible();
    expect(context).toEqual({
      pathname: "/ko/photo/albums/city-night",
      openTarget: { type: "photo", id: "p01" },
    });
  });

  test("지도에서 연 사진도 화면 문맥으로 요청 본문에 실어 보낸다", async ({ page }) => {
    // 사진 상세는 갤러리·앨범·지도 세 곳에서 열린다. 셋 다 같은 모달을 쓰지만 문맥
    // 등록은 호출부가 켜야 해서, 한 곳만 빠져도 그 경로에서만 조용히 사라진다.
    let context: unknown;
    await page.route("**/api/chat", async (route) => {
      context = route.request().postDataJSON().context;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: { role: "assistant", content: "지도에서 고른 사진을 기준으로 답했어요." },
        }),
      });
    });
    await page.goto("/ko/photo/map?photo=p05");
    await expect(page.getByRole("dialog", { name: "심야" })).toBeVisible();

    await openChat(page);
    const dialog = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await expect(dialog.getByText("보고 있는 사진")).toBeVisible();
    await expect(dialog.getByText("심야", { exact: true })).toBeVisible();
    await submit(page, "이 사진 어디서 찍었어?");

    await expect(
      chatMessages(page).getByText("지도에서 고른 사진을 기준으로 답했어요."),
    ).toBeVisible();
    expect(context).toEqual({
      pathname: "/ko/photo/map",
      openTarget: { type: "photo", id: "p05" },
    });
  });

  test("모달을 바꾼 뒤 재시도하면 그 시점의 화면 문맥을 다시 보낸다", async ({ page }) => {
    const contexts: unknown[] = [];
    await page.route("**/api/chat", async (route) => {
      contexts.push(route.request().postDataJSON().context);
      if (contexts.length === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "일시 오류입니다." } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: { role: "assistant", content: "두 번째 사진 기준으로 답했어요." },
        }),
      });
    });
    await page.goto("/ko/photo?photo=p01");
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();

    await openChat(page);
    await submit(page, "이 사진 어디서 찍었어?");
    await expect(chatMessages(page).getByText("일시 오류입니다.")).toBeVisible();

    // 모달 prev/next 내비게이션과 같은 방식으로 열린 사진을 바꾼다 (replaceState + popstate).
    await page.evaluate(() => {
      window.history.replaceState(window.history.state, "", "/ko/photo?photo=p02");
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    });

    await chatMessages(page).getByRole("button", { name: "다시 시도" }).click();

    await expect(chatMessages(page).getByText("두 번째 사진 기준으로 답했어요.")).toBeVisible();
    // 재시도는 저장된 문맥이 아니라 그 시점의 URL을 다시 읽는다.
    expect(contexts[0]).toMatchObject({ openTarget: { type: "photo", id: "p01" } });
    expect(contexts[1]).toMatchObject({ openTarget: { type: "photo", id: "p02" } });
  });

  test("화면 문맥 chip — 표시·제외·모달 전환 시 초기화", async ({ page }) => {
    const contexts: unknown[] = [];
    await page.route("**/api/chat", async (route) => {
      contexts.push(route.request().postDataJSON().context);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: { role: "assistant", content: "네, 확인했어요." } }),
      });
    });
    await page.goto("/ko/photo?photo=p01");
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeVisible();

    await openChat(page);
    const dialog = page.getByRole("dialog", { name: "Ask Sungjoon." });
    // 열린 사진이 chip으로 표시되고 placeholder가 바뀐다.
    await expect(dialog.getByText("보고 있는 사진")).toBeVisible();
    await expect(dialog.getByText("새벽의 항구", { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "메시지" })).toHaveAttribute(
      "placeholder",
      "이 사진에 대해 물어보세요…",
    );

    // ×는 모달을 닫지 않고 챗봇 문맥에서만 제외한다.
    await dialog.getByRole("button", { name: "이 항목을 답변에서 제외" }).click();
    await expect(dialog.getByText("보고 있는 사진")).toBeHidden();
    await expect(page.getByRole("dialog", { name: "새벽의 항구" })).toBeAttached();
    await submit(page, "사진 페이지 이야기");
    await expect(chatMessages(page).getByText("네, 확인했어요.").first()).toBeVisible();
    await expect(chatMessages(page).getByLabel(/함께 보낸 사진/)).toHaveCount(0);
    expect(contexts[0]).toEqual({ pathname: "/ko/photo" });

    // 다른 사진으로 바꾸면(모달 prev/next와 같은 방식) 제외가 초기화되고 chip이 갱신된다.
    await page.evaluate(() => {
      window.history.replaceState(window.history.state, "", "/ko/photo?photo=p02");
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    });
    await expect(dialog.getByText("보고 있는 사진")).toBeVisible();
    await expect(dialog.getByText("골목, 5시", { exact: true })).toBeVisible();
    await submit(page, "이 사진은 어디서 찍었어?");
    await expect(chatMessages(page).getByText("네, 확인했어요.").nth(1)).toBeVisible();
    await expect(chatMessages(page).getByLabel("함께 보낸 사진: 골목, 5시")).toBeVisible();
    expect(contexts[1]).toMatchObject({ openTarget: { type: "photo", id: "p02" } });
  });

  test("연주 모달의 화면 문맥 chip이 표시된다", async ({ page }) => {
    await page.goto("/ko/music?work=winterreise");
    await expect(page.getByRole("dialog")).toBeVisible();

    await openChat(page);
    const dialog = page.getByRole("dialog", { name: "Ask Sungjoon." });
    await expect(dialog.getByText("보고 있는 연주")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "메시지" })).toHaveAttribute(
      "placeholder",
      "이 연주에 대해 물어보세요…",
    );
  });

  test("연락 초안은 버튼을 눌렀을 때만 저장되고 연락 폼을 채운다", async ({ page }) => {
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: {
            role: "assistant",
            content: "문의 내용을 정리해 두었어요.",
            contactDraft: { name: "이성준", email: null, message: "협업 문의드립니다." },
          },
        }),
      }),
    );
    await page.goto("/ko");

    await openChat(page);
    await submit(page, "협업 문의를 대신 전달해줘");
    const button = page.getByRole("link", { name: /연락 페이지에서 이어 쓰기/ });
    await expect(button).toBeVisible();
    // 클릭 전에는 storage에 아무것도 없다.
    expect(await page.evaluate(() => sessionStorage.getItem("ap-contact-draft:v1"))).toBeNull();

    await button.click();

    await expect(page).toHaveURL(/\/ko\/contact$/);
    await expect(page.getByRole("textbox", { name: "이름" })).toHaveValue("이성준");
    await expect(page.getByRole("textbox", { name: /^메시지$/ })).toHaveValue("협업 문의드립니다.");
    // one-shot — 연락 페이지가 읽는 즉시 삭제.
    expect(await page.evaluate(() => sessionStorage.getItem("ap-contact-draft:v1"))).toBeNull();
    // 초안이 채워져도 자동 제출은 없다 — 발송은 방문자 몫.
    await expect(page.getByText("전송 완료")).toHaveCount(0);
    // 비어 있는 첫 칸(이메일)으로 초점 이동.
    await expect(page.getByRole("textbox", { name: "이메일" })).toBeFocused();
  });

  test("sessionStorage를 쓸 수 없어도 초안 버튼은 일반 연락 링크로 동작한다", async ({ page }) => {
    // 저장 용량 초과·차단 환경처럼 sessionStorage 쓰기가 실패하는 상황을 흉내낸다.
    // (프로퍼티 접근 자체가 던지는 극단 케이스는 프레임워크 전체가 깨지는 환경이라
    //  단위 테스트의 가드로만 검증한다.)
    await page.addInitScript(() => {
      window.sessionStorage.setItem = () => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      };
    });
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: {
            role: "assistant",
            content: "문의 내용을 정리해 두었어요.",
            contactDraft: { name: "이성준", email: null, message: "협업 문의드립니다." },
          },
        }),
      }),
    );
    await page.goto("/ko");

    await openChat(page);
    await submit(page, "협업 문의를 대신 전달해줘");
    await page.getByRole("link", { name: /연락 페이지에서 이어 쓰기/ }).click();

    // 저장은 실패하지만 이동은 그대로 — 폼은 비어 있는 일반 연락 폼이다.
    await expect(page).toHaveURL(/\/ko\/contact$/);
    await expect(page.getByRole("textbox", { name: "이름" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: /^메시지$/ })).toHaveValue("");
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
    await expect(customScrollbar).toHaveAttribute(
      "data-scroll-target",
      "chat-message-scroll-container",
    );
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
