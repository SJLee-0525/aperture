// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchSuggestion } from "@/lib/search/suggest-documents";
import { SearchBox } from "@/features/site-header/_components/SearchBox";
import { useSearchSuggestions } from "@/features/site-header/_hooks/use-search-suggestions";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    dict: {
      searchPlaceholder: "검색",
      searchSuggestionsLabel: "추천 결과",
      sectionPhoto: "사진",
      sectionMusic: "음악",
      sectionDev: "개발",
    },
  }),
}));

vi.mock("@/features/site-header/_hooks/use-search-suggestions", () => ({
  useSearchSuggestions: vi.fn(),
}));

const useSearchSuggestionsMock = vi.mocked(useSearchSuggestions);
const loadIndex = vi.fn();

const suggestions: SearchSuggestion[] = [
  {
    key: "photo-dawn",
    section: "photo",
    titleSegments: [
      { text: "부산", hit: true },
      { text: "의 새벽", hit: false },
    ],
    href: "/photo?photo=dawn",
  },
  {
    key: "work-piano",
    section: "music",
    titleSegments: [{ text: "겨울 독주회", hit: false }],
    href: "/music?work=piano",
  },
];

describe("SearchBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchSuggestionsMock.mockReturnValue({ suggestions, loadIndex });
  });
  afterEach(cleanup);

  it("제출 시 통합 검색 페이지로 이동한다", () => {
    render(<SearchBox />);
    const input = screen.getByRole("combobox", { name: "검색" });

    fireEvent.change(input, { target: { value: " React 19 " } });
    fireEvent.submit(input.closest("form")!);

    expect(push).toHaveBeenCalledWith("/search?q=React%2019");
  });

  it("포커스 시 인덱스를 lazy load 하고 추천 리스트를 연다", () => {
    render(<SearchBox />);
    const input = screen.getByRole("combobox", { name: "검색" });

    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(input);

    expect(loadIndex).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("listbox", { name: "추천 결과" })).toBeTruthy();
    expect(screen.getByRole("option", { name: /부산의 새벽/ })).toBeTruthy();
    expect(screen.getByText("사진")).toBeTruthy();
  });

  it("추천 클릭 시 해당 콘텐츠 딥링크로 바로 이동한다", () => {
    render(<SearchBox />);
    fireEvent.focus(screen.getByRole("combobox", { name: "검색" }));

    fireEvent.click(screen.getByRole("option", { name: /겨울 독주회/ }));

    expect(push).toHaveBeenCalledWith("/music?work=piano");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("방향키로 추천을 고르고 Enter 로 이동한다", () => {
    render(<SearchBox />);
    const input = screen.getByRole("combobox", { name: "검색" });
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: /부산의 새벽/ }).getAttribute("aria-selected")).toBe(
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/music?work=piano");
  });

  it("Escape 로 추천 리스트를 닫는다", () => {
    render(<SearchBox />);
    const input = screen.getByRole("combobox", { name: "검색" });
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
