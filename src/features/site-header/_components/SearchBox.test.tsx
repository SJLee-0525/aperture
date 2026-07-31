// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { describe, expect, it, vi } from "vitest";

import { SearchBox } from "@/features/site-header/_components/SearchBox";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ dict: { searchPlaceholder: "검색" } }),
}));

describe("SearchBox", () => {
  it("입력 중에는 React 렌더 없이 값을 유지하고 제출 시 검색한다", () => {
    const onRender = vi.fn();
    render(
      <Profiler id="search" onRender={onRender}>
        <SearchBox />
      </Profiler>,
    );
    const initialCommitCount = onRender.mock.calls.length;
    const input = screen.getByRole("textbox", { name: "검색" });

    fireEvent.input(input, { target: { value: " React 19 " } });
    expect(onRender).toHaveBeenCalledTimes(initialCommitCount);

    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledWith("/search?q=React%2019");
  });
});
