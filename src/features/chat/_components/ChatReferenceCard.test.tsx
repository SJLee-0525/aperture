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

import { ChatReferenceCard } from "@/features/chat/_components/ChatReferenceCard";
import { LangProvider } from "@/features/lang/_components/LangProvider";

afterEach(cleanup);

describe("ChatReferenceCard", () => {
  it("기존 콘텐츠 모달 딥링크로 이동하며 챗봇을 닫는다", () => {
    const onNavigate = vi.fn();
    render(
      <LangProvider lang="ko">
        <ChatReferenceCard
          reference={{
            type: "project",
            id: "project-1",
            title: "Aperture",
            subtitle: "Portfolio project",
            href: "/dev/projects?project=project-1",
            image: null,
          }}
          onNavigate={onNavigate}
        />
      </LangProvider>,
    );

    // 서버 데이터의 무-로케일 href는 LocalizedLink가 렌더 시 현재 언어로 프리픽스한다.
    const link = screen.getByRole("link", { name: "Aperture — Portfolio project" });
    expect(link.getAttribute("href")).toBe("/ko/dev/projects?project=project-1");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
