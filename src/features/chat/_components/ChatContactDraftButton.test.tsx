// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatContactDraftButton } from "@/features/chat/_components/ChatContactDraftButton";

import { SESSION_STORAGE_KEYS } from "@/constants/storage-keys";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: {}, setLang: vi.fn() }),
}));

const DRAFT = { name: "이성준", email: "sj@example.com", message: "협업 문의" };

describe("ChatContactDraftButton", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("클릭 전에는 storage에 아무것도 쓰지 않는다", () => {
    render(<ChatContactDraftButton draft={DRAFT} label="연락 페이지에서 이어 쓰기" />);

    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEYS.CONTACT_DRAFT)).toBeNull();
  });

  it("클릭 시 저장하고 현재 탭에서 /contact로 이동하는 로케일 링크다", () => {
    render(
      <ChatContactDraftButton
        draft={DRAFT}
        label="연락 페이지에서 이어 쓰기"
        onNavigate={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: /연락 페이지에서 이어 쓰기/ });

    expect(link).toHaveProperty("target", "");
    expect(link.getAttribute("href")).toBe("/ko/contact");

    fireEvent.click(link);
    const stored = JSON.parse(
      window.sessionStorage.getItem(SESSION_STORAGE_KEYS.CONTACT_DRAFT) ?? "null",
    ) as { name: string; message: string };
    expect(stored).toMatchObject({ name: "이성준", message: "협업 문의" });
  });

  it("버튼 문구는 항상 사전 label — 초안 값은 노출하지 않는다", () => {
    render(<ChatContactDraftButton draft={DRAFT} label="연락 페이지에서 이어 쓰기" />);

    const link = screen.getByRole("link");
    expect(link.textContent).not.toContain("sj@example.com");
    expect(link.textContent).not.toContain("협업 문의");
  });

  it("storage가 예외를 던져도 패널 닫기와 이동은 그대로 진행된다", () => {
    const onNavigate = vi.fn();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(
      <ChatContactDraftButton
        draft={DRAFT}
        label="연락 페이지에서 이어 쓰기"
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole("link"));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
