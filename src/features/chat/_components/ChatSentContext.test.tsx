// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: (
    props: AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: ReactNode;
      prefetch?: boolean;
      scroll?: boolean;
    },
  ) => {
    const { children, onClick, prefetch, scroll, ...anchorProps } = props;
    void prefetch;
    void scroll;
    return (
      <a
        {...anchorProps}
        onClick={(event) => {
          event.preventDefault();
          onClick?.(event);
        }}
      >
        {children}
      </a>
    );
  },
}));

import { ChatSentContext } from "@/features/chat/_components/ChatSentContext";
import { LangProvider } from "@/features/lang/_components/LangProvider";

afterEach(cleanup);

describe("ChatSentContext", () => {
  it("함께 전송한 항목의 종류와 전체 제목을 접근 가능한 이름으로 표시한다", () => {
    const onNavigate = vi.fn();
    render(
      <LangProvider lang="ko">
        <ChatSentContext
          context={{
            type: "photo",
            id: "p01",
            label: "새벽의 항구",
            href: "/ko/photo/albums/city-night?photo=p01",
          }}
          onNavigate={onNavigate}
        />
      </LangProvider>,
    );

    const link = screen.getByRole("link", { name: "함께 보낸 사진: 새벽의 항구" });
    expect(link.getAttribute("href")).toBe("/ko/photo/albums/city-night?photo=p01");
    expect(screen.getByText("함께 보낸 사진")).toBeTruthy();
    expect(screen.getByText("새벽의 항구")).toBeTruthy();
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("영어 연주 문맥을 현지화한다", () => {
    render(
      <LangProvider lang="en">
        <ChatSentContext
          context={{
            type: "work",
            id: "winterreise",
            label: "Winterreise",
            href: "/en/music?work=winterreise",
          }}
          onNavigate={() => {}}
        />
      </LangProvider>,
    );

    expect(screen.getByLabelText("Sent with performance: Winterreise")).toBeTruthy();
  });
});
