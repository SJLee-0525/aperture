// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatComposer } from "@/features/chat/_components/ChatComposer";

afterEach(cleanup);

describe("ChatComposer", () => {
  it("입력 중에는 React 렌더 없이 값을 유지하고 제출 시 메시지를 전달한다", () => {
    const onRender = vi.fn();
    const onSend = vi.fn(() => true);
    render(
      <Profiler id="chat-composer" onRender={onRender}>
        <ChatComposer
          inputLabel="메시지"
          placeholder="궁금한 내용을 입력하세요…"
          sendLabel="메시지 보내기"
          isReplying={false}
          onSend={onSend}
        />
      </Profiler>,
    );
    const initialCommitCount = onRender.mock.calls.length;
    const input = screen.getByRole("textbox", { name: "메시지" });
    expect(input.tagName).toBe("TEXTAREA");
    expect(input.getAttribute("rows")).toBe("1");

    fireEvent.input(input, { target: { value: " 개발\n프로젝트 " } });
    expect(onRender).toHaveBeenCalledTimes(initialCommitCount);

    fireEvent.submit(input.closest("form")!);
    expect(onSend).toHaveBeenCalledWith(" 개발\n프로젝트 ");
    expect((input as HTMLTextAreaElement).value).toBe("");
  });

  it("Enter로 전송하고 Shift+Enter는 줄바꿈을 허용한다", () => {
    const onSend = vi.fn(() => true);
    render(
      <ChatComposer
        inputLabel="메시지"
        placeholder="궁금한 내용을 입력하세요…"
        sendLabel="메시지 보내기"
        isReplying={false}
        onSend={onSend}
      />,
    );
    const input = screen.getByRole("textbox", { name: "메시지" });

    fireEvent.input(input, { target: { value: "첫 줄" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("첫 줄");
  });
});
