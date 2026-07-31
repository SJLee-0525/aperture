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
    },
  }),
}));

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
});
