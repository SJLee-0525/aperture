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

afterEach(cleanup);

describe("ChatReferenceCard", () => {
  it("기존 콘텐츠 모달 딥링크로 이동하며 챗봇을 닫는다", () => {
    const onNavigate = vi.fn();
    render(
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
      />,
    );

    const link = screen.getByRole("link", { name: "Aperture — Portfolio project" });
    expect(link.getAttribute("href")).toBe("/dev/projects?project=project-1");
    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
