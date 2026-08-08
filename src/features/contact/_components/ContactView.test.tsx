// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
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

  it("캡차 위젯이 없으면 보내기 버튼을 잠그지 않는다", () => {
    render(<ContactView site={MOCK_SITE} />);

    // 스크립트가 차단된 환경에서 버튼이 영영 죽으면 안 된다 — 제출 시 안내로 막는 쪽이 낫다.
    expect(sendButton().disabled).toBe(false);
  });

  it("캡차가 미해결이면 보내기 버튼을 잠그고 이유를 안내한다", async () => {
    render(<ContactView site={MOCK_SITE} />);
    injectCaptchaField("");

    await vi.waitFor(() => expect(sendButton().disabled).toBe(true));
    expect(screen.getByText("스팸 방지 확인을 완료해 주세요.")).toBeTruthy();
  });

  it("캡차를 해결하면 보내기 버튼이 풀린다", async () => {
    render(<ContactView site={MOCK_SITE} />);
    injectCaptchaField("");
    await vi.waitFor(() => expect(sendButton().disabled).toBe(true));

    // 방문자가 체크박스를 통과하면 hCaptcha 가 같은 필드에 토큰을 채운다.
    document.querySelector<HTMLTextAreaElement>('[name="h-captcha-response"]')!.value = "token";

    await vi.waitFor(() => expect(sendButton().disabled).toBe(false));
    expect(screen.queryByText("스팸 방지 확인을 완료해 주세요.")).toBeNull();
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
