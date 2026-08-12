// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViewToggle } from "@/components/ViewToggle";

const OPTIONS = [
  { id: "grid", label: "그리드", icon: "square" },
  { id: "list", label: "목록", icon: "list" },
] as const;

describe("ViewToggle", () => {
  afterEach(cleanup);

  it("선택지를 라벨로 찾을 수 있는 버튼으로 표시한다", () => {
    render(<ViewToggle options={OPTIONS} value="grid" onChange={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "그리드" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "목록" })).toBeTruthy();
  });

  it("현재 값의 버튼만 눌린 상태로 둔다", () => {
    render(<ViewToggle options={OPTIONS} value="list" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "목록" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "그리드" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("누른 선택지의 id 를 전달한다", () => {
    const onChange = vi.fn();
    render(<ViewToggle options={OPTIONS} value="grid" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "목록" }));

    expect(onChange).toHaveBeenCalledWith("list");
  });
});
