// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/Modal";

describe("Modal", () => {
  afterEach(cleanup);

  it("열리면 접근 가능한 대화상자와 콘텐츠를 document body에 표시한다", () => {
    render(
      <Modal open onClose={vi.fn()} label="프로젝트 상세" crumb="개발">
        <p>상세 내용</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "프로젝트 상세" })).toBeTruthy();
    expect(screen.getByText("상세 내용")).toBeTruthy();
    expect(screen.getByText("개발")).toBeTruthy();
  });

  it("닫혀 있으면 대화상자와 콘텐츠를 표시하지 않는다", () => {
    render(
      <Modal open={false} onClose={vi.fn()} label="프로젝트 상세">
        <p>상세 내용</p>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("상세 내용")).toBeNull();
  });

  it("닫기 버튼과 스크림을 누르면 모달을 닫는다", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="프로젝트 상세">
        <p>상세 내용</p>
      </Modal>,
    );
    const closeButtons = screen.getAllByRole("button", { name: "Close" });

    fireEvent.click(closeButtons[0]);
    fireEvent.click(closeButtons[1]);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("Escape 키로 닫고 다른 키는 무시한다", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} label="프로젝트 상세">
        <p>상세 내용</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("열려 있는 동안 body 스크롤을 잠그고 닫히면 원래 스타일을 복원한다", () => {
    document.body.style.overflow = "auto";
    const { rerender } = render(
      <Modal open onClose={vi.fn()} label="프로젝트 상세">
        <p>상세 내용</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal open={false} onClose={vi.fn()} label="프로젝트 상세">
        <p>상세 내용</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("auto");
  });

  it("Tab 포커스를 대화상자 안에서 순환시키고 닫히면 트리거로 복귀한다", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "열기";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Modal open onClose={vi.fn()} label="프로젝트 상세">
        <button type="button">첫 작업</button>
        <button type="button">마지막 작업</button>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "프로젝트 상세" });
    const buttons = within(dialog).getAllByRole("button");
    for (const button of buttons) {
      Object.defineProperty(button, "offsetParent", { configurable: true, value: dialog });
    }
    const lastButton = buttons.at(-1);
    lastButton?.focus();
    fireEvent.keyDown(lastButton!, { key: "Tab" });

    expect(document.activeElement).toBe(buttons[0]);

    rerender(
      <Modal open={false} onClose={vi.fn()} label="프로젝트 상세">
        <button type="button">첫 작업</button>
      </Modal>,
    );
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
