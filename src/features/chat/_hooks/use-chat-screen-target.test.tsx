// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChatScreenTargetProvider } from "@/components/ChatScreenTargetProvider";

import { useChatScreenTarget } from "@/features/chat/_hooks/use-chat-screen-target";
import { useRegisterChatScreenTarget } from "@/hooks/use-register-chat-screen-target";

import type { ChatScreenTarget } from "@/lib/chat-screen-target-context";

const Reader = () => {
  const target = useChatScreenTarget();
  return (
    <output data-testid="target">
      {target ? `${target.type}:${target.id}:${target.label}` : "none"}
    </output>
  );
};

const Register = ({ target }: { target: ChatScreenTarget | null }) => {
  useRegisterChatScreenTarget(target);
  return null;
};

const PHOTO: ChatScreenTarget = { type: "photo", id: "p01", label: "새벽의 항구" };

describe("chat screen target", () => {
  afterEach(cleanup);

  it("등록한 항목을 구독자가 읽는다", () => {
    render(
      <ChatScreenTargetProvider>
        <Register target={PHOTO} />
        <Reader />
      </ChatScreenTargetProvider>,
    );
    expect(screen.getByTestId("target").textContent).toBe("photo:p01:새벽의 항구");
  });

  it("항목이 바뀌면 표시값을 교체한다", () => {
    const view = render(
      <ChatScreenTargetProvider>
        <Register target={PHOTO} />
        <Reader />
      </ChatScreenTargetProvider>,
    );
    view.rerender(
      <ChatScreenTargetProvider>
        <Register target={{ type: "work", id: "w1", label: "겨울 나그네" }} />
        <Reader />
      </ChatScreenTargetProvider>,
    );
    expect(screen.getByTestId("target").textContent).toBe("work:w1:겨울 나그네");
  });

  it("이전 등록자가 해제되어도 더 최근 항목을 유지한다", () => {
    const view = render(
      <ChatScreenTargetProvider>
        <Register key="photo" target={PHOTO} />
        <Register key="work" target={{ type: "work", id: "w1", label: "겨울 나그네" }} />
        <Reader />
      </ChatScreenTargetProvider>,
    );
    view.rerender(
      <ChatScreenTargetProvider>
        <Register key="work" target={{ type: "work", id: "w1", label: "겨울 나그네" }} />
        <Reader />
      </ChatScreenTargetProvider>,
    );
    expect(screen.getByTestId("target").textContent).toBe("work:w1:겨울 나그네");
  });

  it("Provider 밖에서는 등록과 조회를 무시한다", () => {
    render(
      <>
        <Register target={PHOTO} />
        <Reader />
      </>,
    );
    expect(screen.getByTestId("target").textContent).toBe("none");
  });
});
