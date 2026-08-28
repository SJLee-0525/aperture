// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { usePopupDisclosure } from "@/hooks/use-popup-disclosure";

afterEach(cleanup);

const Popup = () => {
  const { open, triggerRef, rootRef, toggle, close } = usePopupDisclosure();

  return (
    <div>
      <div ref={rootRef}>
        <button ref={triggerRef} type="button" aria-expanded={open} onClick={toggle}>
          열기
        </button>
        {open ? (
          <button type="button" onClick={close}>
            고르기
          </button>
        ) : null}
      </div>
      <button type="button">바깥</button>
    </div>
  );
};

const trigger = () => screen.getByRole("button", { name: "열기" });

describe("usePopupDisclosure", () => {
  it("트리거로 여닫는다", () => {
    render(<Popup />);

    act(() => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");

    act(() => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("패널 안에서 닫으면 트리거로 포커스를 되돌린다", () => {
    render(<Popup />);
    act(() => trigger().click());

    const option = screen.getByRole("button", { name: "고르기" });
    option.focus();
    act(() => option.click());

    expect(document.activeElement).toBe(trigger());
  });

  it("Escape 로 닫고 트리거로 포커스를 되돌린다", () => {
    render(<Popup />);
    act(() => trigger().click());
    screen.getByRole("button", { name: "고르기" }).focus();

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  it("바깥을 누르면 닫되 포커스를 가져오지 않는다", () => {
    render(<Popup />);
    act(() => trigger().click());

    const outside = screen.getByRole("button", { name: "바깥" });
    outside.focus();
    act(() => {
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(outside);
  });
});
