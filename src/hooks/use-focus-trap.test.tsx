// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useFocusTrap } from "@/hooks/use-focus-trap";

const Harness = ({ active }: { active: boolean }) => {
  const ref = useFocusTrap(active);
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      <button>첫 번째</button>
      <button>마지막</button>
    </div>
  );
};

describe("useFocusTrap", () => {
  let offsetParentDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    offsetParentDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return document.body;
      },
    });
  });

  afterEach(() => {
    cleanup();
    if (offsetParentDescriptor) {
      Object.defineProperty(HTMLElement.prototype, "offsetParent", offsetParentDescriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "offsetParent");
    }
  });

  it("활성화되면 대화상자 컨테이너로 포커스를 이동한다", () => {
    const { getByTestId } = render(<Harness active />);

    expect(document.activeElement).toBe(getByTestId("dialog"));
  });

  it("마지막 항목에서 Tab을 누르면 첫 항목으로 순환한다", () => {
    const { getByRole, getByTestId } = render(<Harness active />);
    const first = getByRole("button", { name: "첫 번째" });
    const last = getByRole("button", { name: "마지막" });
    last.focus();

    fireEvent.keyDown(getByTestId("dialog"), { key: "Tab" });

    expect(document.activeElement).toBe(first);
  });

  it("첫 항목에서 Shift+Tab을 누르면 마지막 항목으로 순환한다", () => {
    const { getByRole, getByTestId } = render(<Harness active />);
    const first = getByRole("button", { name: "첫 번째" });
    const last = getByRole("button", { name: "마지막" });
    first.focus();

    fireEvent.keyDown(getByTestId("dialog"), { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  it("비활성화될 때 대화상자를 열기 전 요소로 포커스를 복원한다", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { rerender } = render(<Harness active />);

    rerender(<Harness active={false} />);

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("비활성 상태에서는 현재 포커스를 변경하지 않는다", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();

    render(<Harness active={false} />);

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
