// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactView } from "@/features/contact/_components/ContactView";
import { MOCK_SITE } from "@/mocks/site";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      contactNav: "문의",
      contactName: "이름",
      contactEmail: "이메일",
      contactMessage: "메시지",
      contactResizeMessage: "메시지 입력란 크기 조절",
      contactSend: "메일 보내기",
      contactSending: "보내는 중…",
      contactSent: "전송 완료",
      contactSendError: "전송 실패",
      contactCaptchaRequired: "스팸 방지 확인을 완료해 주세요.",
      contactPrivacyNotice: "입력한 정보는 문의에 사용됩니다.",
      privacyNav: "개인정보 처리방침",
    },
  }),
}));

/**
 * hCaptcha 가 폼에 심는 토큰 필드를 흉내낸다 — 위젯은 테스트 환경에서 로드되지 않는다.
 *
 * @param {string} value
 * @returns {void}
 */
const injectCaptchaField = (value: string) => {
  const form = document.querySelector("form");
  const field = document.createElement("textarea");
  field.name = "h-captcha-response";
  field.value = value;
  form?.append(field);
};

describe("ContactView", () => {
  afterEach(cleanup);

  it("입력 중에는 React 렌더를 발생시키지 않는다", () => {
    const onRender = vi.fn();
    render(
      <Profiler id="contact" onRender={onRender}>
        <ContactView site={MOCK_SITE} />
      </Profiler>,
    );
    const initialCommitCount = onRender.mock.calls.length;

    fireEvent.input(screen.getByRole("textbox", { name: "이름" }), {
      target: { value: "이성준" },
    });
    fireEvent.input(screen.getByRole("textbox", { name: "이메일" }), {
      target: { value: "hello@example.com" },
    });
    fireEvent.input(screen.getByRole("textbox", { name: /^메시지$/ }), {
      target: { value: "문의합니다." },
    });

    expect(onRender).toHaveBeenCalledTimes(initialCommitCount);
  });

  const sendButton = () => screen.getByRole("button", { name: "메일 보내기" }) as HTMLButtonElement;

  const sendBlocked = () => sendButton().getAttribute("aria-disabled") === "true";

  it("캡차 위젯이 없으면 보내기 버튼을 잠그지 않는다", () => {
    render(<ContactView site={MOCK_SITE} />);

    // 스크립트가 차단된 환경에서 버튼이 영영 죽으면 안 된다 — 제출 시 안내로 막는 쪽이 낫다.
    expect(sendBlocked()).toBe(false);
    expect(sendButton().disabled).toBe(false);
  });

  it("캡차가 미해결이면 보내기 버튼을 잠그고 이유를 안내한다", async () => {
    render(<ContactView site={MOCK_SITE} />);
    injectCaptchaField("");

    await vi.waitFor(() => expect(sendBlocked()).toBe(true));
    expect(screen.getByText("스팸 방지 확인을 완료해 주세요.")).toBeTruthy();
    // 실제 disabled 로 잠그면 브라우저가 제출 버튼으로 세지 않아 선언형 WebMCP 도구가
    // "No submit button was found" 로 실패한다 — 잠금은 aria-disabled 로만 표시한다.
    expect(sendButton().disabled).toBe(false);
  });

  it("캡차를 해결하면 보내기 버튼이 풀린다", async () => {
    render(<ContactView site={MOCK_SITE} />);
    injectCaptchaField("");
    await vi.waitFor(() => expect(sendBlocked()).toBe(true));

    // 방문자가 체크박스를 통과하면 hCaptcha 가 같은 필드에 토큰을 채운다.
    document.querySelector<HTMLTextAreaElement>('[name="h-captcha-response"]')!.value = "token";

    await vi.waitFor(() => expect(sendBlocked()).toBe(false));
    expect(screen.queryByText("스팸 방지 확인을 완료해 주세요.")).toBeNull();
  });

  describe("연락 초안 프리필 (ContactForm draft injection)", () => {
    const KEY = "ap-contact-draft:v1";
    const storedDraft = (fields: { name: string; email: string; message: string }) =>
      JSON.stringify({
        version: 1,
        createdAt: Date.now() - 1_000,
        expiresAt: Date.now() + 60_000,
        ...fields,
      });

    afterEach(() => window.sessionStorage.clear());

    it("초안을 폼에 채우고 storage에서 삭제하며 첫 빈 칸에 초점을 둔다", () => {
      window.sessionStorage.setItem(
        KEY,
        storedDraft({ name: "이성준", email: "", message: "협업 문의드립니다." }),
      );
      render(<ContactView site={MOCK_SITE} />);

      expect((screen.getByRole("textbox", { name: "이름" }) as HTMLInputElement).value).toBe(
        "이성준",
      );
      expect((screen.getByRole("textbox", { name: /^메시지$/ }) as HTMLTextAreaElement).value).toBe(
        "협업 문의드립니다.",
      );
      // one-shot — 읽는 즉시 삭제.
      expect(window.sessionStorage.getItem(KEY)).toBeNull();
      // 비어 있는 이메일 칸으로 초점 이동.
      expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "이메일" }));
    });

    it("자동 제출하지 않고 name·required·WebMCP toolname 구조를 유지한다", () => {
      window.sessionStorage.setItem(
        KEY,
        storedDraft({ name: "이성준", email: "sj@example.com", message: "문의" }),
      );
      const submit = vi.fn();
      render(<ContactView site={MOCK_SITE} />);
      document.querySelector("form")?.addEventListener("submit", submit);

      expect(submit).not.toHaveBeenCalled();
      const form = document.querySelector("form")!;
      expect(form.getAttribute("toolname")).toBe("prepare_contact_message");
      for (const name of ["name", "email", "message"]) {
        expect(form.querySelector(`[name="${name}"]`)?.hasAttribute("required")).toBe(true);
      }
    });

    it("Strict Mode의 effect 재실행에도 초안은 한 번만 적용되고 값이 유지된다", () => {
      window.sessionStorage.setItem(
        KEY,
        storedDraft({ name: "이성준", email: "", message: "협업 문의드립니다." }),
      );
      render(
        <StrictMode>
          <ContactView site={MOCK_SITE} />
        </StrictMode>,
      );

      // 두 번째 effect 실행에서는 storage가 이미 비어 있어 no-op — 값은 그대로 남는다.
      expect((screen.getByRole("textbox", { name: "이름" }) as HTMLInputElement).value).toBe(
        "이성준",
      );
      expect((screen.getByRole("textbox", { name: /^메시지$/ }) as HTMLTextAreaElement).value).toBe(
        "협업 문의드립니다.",
      );
      expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });

    it("만료된 초안은 폼에 넣지 않되 storage에서는 삭제한다", () => {
      window.sessionStorage.setItem(
        KEY,
        JSON.stringify({
          version: 1,
          createdAt: Date.now() - 120_000,
          expiresAt: Date.now() - 60_000,
          name: "이성준",
          email: "",
          message: "지난 문의",
        }),
      );
      render(<ContactView site={MOCK_SITE} />);

      expect((screen.getByRole("textbox", { name: /^메시지$/ }) as HTMLTextAreaElement).value).toBe(
        "",
      );
      expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });
  });

  it.each([
    ["키가 있으면 캡차 위젯을 렌더한다", "test-access-key", 1],
    ["키가 없으면(mailto 폴백) 캡차 위젯을 렌더하지 않는다", undefined, 0],
  ])("%s", async (_label, accessKey, expected) => {
    // 모듈 최상단에서 env 를 읽으므로 stub 후 다시 import 해야 조건이 반영된다.
    vi.stubEnv("NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY", accessKey);
    vi.resetModules();
    const { ContactView: Fresh } = await import("@/features/contact/_components/ContactView");

    render(<Fresh site={MOCK_SITE} />);

    // 캡차는 Web3Forms 제출 전용 — mailto 폴백에서 캡차를 풀게 하면 헛수고를 시킨다.
    expect(document.querySelectorAll(".h-captcha")).toHaveLength(expected);
    vi.unstubAllEnvs();
  });
});
