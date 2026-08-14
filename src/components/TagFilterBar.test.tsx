// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TagFilterBar } from "@/components/TagFilterBar";

// jsdom 에는 ResizeObserver 가 없다. 칩 줄의 넘침 감시가 마운트 때 이걸 만든다.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

const ITEMS = [
  { id: "nextjs", label: "Next.js" },
  { id: "css", label: "CSS" },
];

describe("TagFilterBar", () => {
  afterEach(cleanup);

  it("전체 칩을 태그 앞에 두고 선택된 항목만 눌린 상태로 둔다", () => {
    render(<TagFilterBar items={ITEMS} activeId="css" allLabel="전체" onSelect={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["전체", "Next.js", "CSS"]);
    expect(screen.getByRole("button", { name: "CSS" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "전체" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("선택이 없으면 전체 칩이 활성이다", () => {
    render(<TagFilterBar items={ITEMS} activeId={null} allLabel="전체" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "전체" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("태그는 id 로, 전체는 null 로 알린다", () => {
    const onSelect = vi.fn();
    render(<TagFilterBar items={ITEMS} activeId={null} allLabel="전체" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Next.js" }));
    expect(onSelect).toHaveBeenLastCalledWith("nextjs");

    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("trailing 도구를 칩 행과 같은 줄에 렌더한다", () => {
    render(
      <TagFilterBar
        items={ITEMS}
        activeId={null}
        allLabel="전체"
        onSelect={vi.fn()}
        trailing={<button type="button">필터</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "필터" })).toBeTruthy();
  });
});
