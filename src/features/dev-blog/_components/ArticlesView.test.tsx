// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

const summary = (id: string, tags: string[], pinned = false): DevArticleSummary => ({
  id,
  slug: id,
  title: { ko: `${id} 제목`, en: `${id} title` },
  summary: { ko: "요약", en: "Summary" },
  cover: null,
  coverAlt: null,
  tags,
  pinned,
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

describe("ArticlesView — 고정 글", () => {
  /** 고정 1건 + css 태그 9건. 고정 글을 빼면 일반 목록이 두 페이지가 된다. */
  const PINNED = summary("pinned-note", ["css"], true);
  const WITH_PINNED = [PINNED, ...ARTICLES];

  const renderPinned = () => render(<ArticlesView articles={WITH_PINNED} tags={TAGS} />);

  /** 고정 섹션 안의 글 제목. 섹션 제목도 h2 라 그것만 걷어낸다. */
  const pinnedTitles = () =>
    within(screen.getByRole("region", { name: DICTIONARY.ko.articlesPinned }))
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) => text !== DICTIONARY.ko.articlesPinned);

  beforeEach(() => {
    window.history.replaceState({}, "", "/ko/dev/articles");
  });

  afterEach(() => {
    cleanup();
    mocks.search = new URLSearchParams();
    mocks.push.mockClear();
    mocks.replace.mockClear();
  });

  it("고정 글을 별도 섹션에 보여 준다", () => {
    renderPinned();

    expect(pinnedTitles()).toEqual(["pinned-note 제목"]);
  });

  it("고정 글은 아래 목록에도 발행일 자리에 그대로 남는다", () => {
    renderPinned();

    const listed = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    // 섹션 제목 1 + 고정 섹션 카드 1 + 목록 카드 1.
    expect(listed.filter((text) => text === "pinned-note 제목")).toHaveLength(2);
  });

  it("페이지를 넘겨도 고정 섹션은 남는다", () => {
    mocks.search = new URLSearchParams("page=2");
    window.history.replaceState({}, "", "/ko/dev/articles?page=2");
    renderPinned();

    expect(pinnedTitles()).toEqual(["pinned-note 제목"]);
  });

  it("고정은 페이지 나누기를 바꾸지 않는다", () => {
    renderPinned();

    // 11건이 그대로 페이지 대상이다 — 고정해도 공유한 페이지 주소의 내용이 밀리지 않는다.
    expect(screen.getByText("11 articles")).toBeTruthy();
    const lastPage = DICTIONARY.ko.paginationPage.replace("{n}", "2");
    expect(screen.getByRole("button", { name: lastPage })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: DICTIONARY.ko.paginationPage.replace("{n}", "3") }),
    ).toBeNull();
  });

  it("태그 필터는 고정 글에도 적용된다", () => {
    mocks.search = new URLSearchParams("tag=testing");
    renderPinned();

    expect(screen.queryByRole("region", { name: DICTIONARY.ko.articlesPinned })).toBeNull();
  });

  it("고정 섹션은 보기 토글과 무관하게 목록 행으로 그린다", () => {
    mocks.search = new URLSearchParams("view=grid");
    renderPinned();

    const section = screen.getByRole("region", { name: DICTIONARY.ko.articlesPinned });
    expect(section.querySelector("[data-view='grid']")).toBeNull();
    expect(section.querySelectorAll("[data-view='list']").length).toBeGreaterThan(0);
  });
});
