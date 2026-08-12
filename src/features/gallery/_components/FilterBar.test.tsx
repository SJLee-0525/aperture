// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LangProvider } from "@/features/lang/_components/LangProvider";
import { FilterBar } from "@/features/gallery/_components/FilterBar";

// jsdom 에는 ResizeObserver 가 없다. 태그 칩 줄(TagFilterBar)이 넘침 감시에 쓴다.
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

const renderFilterBar = () =>
  render(
    <LangProvider>
      <FilterBar
        tags={[]}
        cameras={["Camera"]}
        tag="__all__"
        onTag={vi.fn()}
        camera="__all__"
        onCamera={vi.fn()}
        focalMin={16}
        focalMax={300}
        onFocal={vi.fn()}
        onReset={vi.fn()}
        filtersActive={false}
      />
    </LangProvider>,
  );

describe("FilterBar", () => {
  afterEach(cleanup);

  it("Escape로 팝오버를 닫고 트리거에 포커스를 돌려준다", () => {
    renderFilterBar();
    const trigger = screen.getByRole("button", { name: "필터" });
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "초기화" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "초기화" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
