// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ArticlesView } from "@/features/dev-blog/_components/ArticlesView";

import { DICTIONARY } from "@/constants/dictionary";

import type { DevArticleSummary } from "@/features/dev-blog/_lib/article-projection";
import type { DevArticleTag } from "@/types/dev-article-tag";

const mocks = vi.hoisted(() => ({
  search: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.search }));
vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: DICTIONARY.ko }),
}));
vi.mock("@/lib/navigation/replace-current-url", () => ({
  pushCurrentUrl: (href: string) => mocks.push(href),
  replaceCurrentUrl: (href: string) => mocks.replace(href),
}));

const TAGS: DevArticleTag[] = [
  { id: "css", ko: "CSS", en: "CSS" },
  { id: "testing", ko: "테스트", en: "Testing" },
  // 어느 글도 쓰지 않는 태그 — 빈 결과 안내를 확인한다.
  { id: "accessibility", ko: "접근성", en: "Accessibility" },
];

const summary = (id: string, tags: string[]): DevArticleSummary => ({
  id,
  slug: id,
  title: { ko: `${id} 제목`, en: `${id} title` },
  summary: { ko: "요약", en: "Summary" },
  cover: null,
  coverAlt: null,
  tags,
  publishedAt: new Date("2026-05-01T09:00:00+09:00"),
  readingMinutes: 3,
  relatedProjectIds: [],
});

const ARTICLES = [
  ...Array.from({ length: 9 }, (_, index) => summary(`a${index}`, ["css"])),
  summary("only-testing", ["testing"]),
];

const renderView = () => render(<ArticlesView articles={ARTICLES} tags={TAGS} />);

// jsdom 에는 ResizeObserver 가 없다. 태그 칩 줄이 넘침 감시에 쓴다.
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

describe("ArticlesView", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/ko/dev/articles");
  });

  afterEach(() => {
    cleanup();
    mocks.search = new URLSearchParams();
    mocks.push.mockClear();
    mocks.replace.mockClear();
  });

  it("한 페이지 정원까지만 그리고 전체 개수를 표시한다", () => {
    renderView();

    expect(screen.getByText("10 articles")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8);
  });

  it("태그를 고르면 결과와 주소가 함께 바뀐다", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "테스트" }));

    expect(mocks.push).toHaveBeenCalledWith("/ko/dev/articles?tag=testing");
  });

  it("선택한 태그로 목록을 거른다", () => {
    mocks.search = new URLSearchParams("tag=testing");
    renderView();

    expect(screen.getByText("1 articles")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  });

  it("범위를 벗어난 페이지는 주소를 정규화한다", () => {
    mocks.search = new URLSearchParams("page=99");
    window.history.replaceState({}, "", "/ko/dev/articles?page=99");
    renderView();

    expect(mocks.replace).toHaveBeenCalledWith("/ko/dev/articles?page=2");
  });

  it("결과가 없는 태그에는 선택한 태그와 초기화를 함께 보여 준다", () => {
    mocks.search = new URLSearchParams("tag=accessibility");
    renderView();

    expect(screen.getByText(DICTIONARY.ko.articlesEmptyTag)).toBeTruthy();
    const reset = screen.getByRole("button", { name: /접근성.*초기화/ });
    fireEvent.click(reset);
    expect(mocks.push).toHaveBeenCalledWith("/ko/dev/articles");
  });

  it("보기를 바꾸면 페이지를 1로 되돌린다", () => {
    mocks.search = new URLSearchParams("page=2");
    window.history.replaceState({}, "", "/ko/dev/articles?page=2");
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "목록" }));

    expect(mocks.push).toHaveBeenCalledWith("/ko/dev/articles?view=list");
  });
});
