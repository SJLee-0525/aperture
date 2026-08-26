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

const HIDDEN_LABEL = "숨김";

/**
 * jsdom 에는 레이아웃이 없어 getClientRects 가 늘 빈 배열이다.
 * 가시성 판정을 검증하려면 이 자리에서 값을 만들어야 한다.
 * `숨김` 라벨이 붙은 요소만 사각형이 없는 것으로 취급한다.
 */
const HiddenItemHarness = () => {
  const ref = useFocusTrap(true);
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      <button>첫 번째</button>
      <button>{HIDDEN_LABEL}</button>
      <button>마지막</button>
    </div>
  );
};

describe("useFocusTrap", () => {
  let clientRectsDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    clientRectsDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "getClientRects",
    );
    Object.defineProperty(Element.prototype, "getClientRects", {
      configurable: true,
      writable: true,
      value(this: Element) {
        return this.textContent === HIDDEN_LABEL ? [] : [{ width: 10, height: 10 }];
      },
    });
  });

  afterEach(() => {
    cleanup();
    if (clientRectsDescriptor) {
      Object.defineProperty(Element.prototype, "getClientRects", clientRectsDescriptor);
    } else {
      Reflect.deleteProperty(Element.prototype, "getClientRects");
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

  // fixed 요소는 offsetParent 가 항상 null 이라, 그 값으로 거르면 라이트박스의
  // 닫기·이전·다음 버튼이 통째로 순환에서 빠진다.
  it("offsetParent 가 null 인 요소도 사각형이 있으면 순환에 포함한다", () => {
    const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get: () => null,
    });
    const { getByRole, getByTestId } = render(<Harness active />);
    const first = getByRole("button", { name: "첫 번째" });
    const last = getByRole("button", { name: "마지막" });
    last.focus();

    fireEvent.keyDown(getByTestId("dialog"), { key: "Tab" });

    expect(document.activeElement).toBe(first);
    if (offsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", offsetParent);
    else Reflect.deleteProperty(HTMLElement.prototype, "offsetParent");
  });

  it("사각형이 없는 요소는 순환에서 제외한다", () => {
    const { getByRole, getByTestId } = render(<HiddenItemHarness />);
    const first = getByRole("button", { name: "첫 번째" });
    const hidden = getByRole("button", { name: HIDDEN_LABEL });
    first.focus();

    fireEvent.keyDown(getByTestId("dialog"), { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(getByRole("button", { name: "마지막" }));
    expect(document.activeElement).not.toBe(hidden);
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
