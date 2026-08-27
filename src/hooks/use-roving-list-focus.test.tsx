// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useRovingListFocus } from "@/hooks/use-roving-list-focus";

afterEach(cleanup);

const LABELS = ["첫째", "둘째", "셋째"];

const List = ({ open = true, activeIndex }: { open?: boolean; activeIndex?: number }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useRovingListFocus(open, listRef, { activeIndex });

  return (
    <div ref={listRef} role="listbox" onKeyDown={onKeyDown}>
      {LABELS.map((label) => (
        <button key={label} data-list-item type="button" role="option" aria-selected={false}>
          {label}
        </button>
      ))}
    </div>
  );
};

const item = (label: string) => screen.getByRole("option", { name: label });
const press = (key: string) => fireEvent.keyDown(screen.getByRole("listbox"), { key });

describe("useRovingListFocus", () => {
  it("열릴 때 첫 항목으로 포커스를 옮긴다", () => {
    render(<List />);

    expect(document.activeElement).toBe(item("첫째"));
  });

  it("선택된 항목이 있으면 그쪽으로 옮긴다", () => {
    render(<List activeIndex={2} />);

    expect(document.activeElement).toBe(item("셋째"));
  });

  it("닫힌 목록에는 포커스를 옮기지 않는다", () => {
    render(<List open={false} />);

    expect(document.activeElement).toBe(document.body);
  });

  it("위아래 방향키로 이동하고 끝에서 순환한다", () => {
    render(<List />);

    press("ArrowDown");
    expect(document.activeElement).toBe(item("둘째"));

    press("ArrowUp");
    expect(document.activeElement).toBe(item("첫째"));

    press("ArrowUp");
    expect(document.activeElement).toBe(item("셋째"));
  });

  it("Home 과 End 로 양끝에 간다", () => {
    render(<List />);

    press("End");
    expect(document.activeElement).toBe(item("셋째"));

    press("Home");
    expect(document.activeElement).toBe(item("첫째"));
  });

  it("다른 키는 넘긴다", () => {
    render(<List />);

    press("a");
    expect(document.activeElement).toBe(item("첫째"));
  });
});
