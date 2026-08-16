// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchResults } from "@/features/search/_components/SearchResults";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { DICTIONARY } from "@/constants/dictionary";

import type { Group } from "@/features/search/_lib/build-search-groups";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: vi.fn(),
}));

const useLangMock = vi.mocked(useLang);

const photoGroup: Group = {
  key: "photo",
  section: "photo",
  label: DICTIONARY.ko.sectionPhoto,
  hits: [
    {
      key: "photo-1",
      titleSegments: [
        { text: "부산", hit: true },
        { text: "의 새벽", hit: false },
      ],
      meta: "부산",
      href: "/photo?photo=1",
      imageUrl: "/photo-thumb.webp",
      score: 3,
    },
  ],
};

const blogGroup: Group = {
  key: "blog",
  section: "dev",
  label: DICTIONARY.ko.devArticlesNav,
  hits: [
    {
      key: "article-1",
      titleSegments: [{ text: "포트폴리오를 서버 없이", hit: false }],
      meta: "Firebase · 아키텍처",
      href: "/dev/articles/serverless",
      score: 0,
      snippetSegments: [
        { text: "…", hit: false },
        { text: "수파베이스", hit: true },
        { text: "로 옮긴 이유는…", hit: false },
      ],
    },
  ],
};

describe("SearchResults", () => {
  beforeEach(() => {
    useLangMock.mockReturnValue({ lang: "ko", dict: DICTIONARY.ko, setLang: vi.fn() });
  });

  afterEach(() => {
    cleanup();
  });

  it("검색어가 없으면 검색 안내를 보여준다", () => {
    render(<SearchResults q="" lang="ko" groups={[]} total={0} />);

    expect(screen.getByRole("heading", { name: DICTIONARY.ko.searchPlaceholder })).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.searchPrompt)).toBeTruthy();
  });

  it("확정 결과가 없으면 빈 결과 안내와 0건을 보여준다", () => {
    render(<SearchResults q="제주" lang="ko" groups={[]} total={0} />);

    expect(screen.getByText(DICTIONARY.ko.searchEmpty)).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.searchEmptyChatHint)).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("그룹 라벨·개수·현재 언어 링크를 보여준다", () => {
    render(<SearchResults q="부산" lang="ko" groups={[photoGroup]} total={1} />);

    expect(screen.getByRole("heading", { name: "“부산”" })).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.sectionPhoto)).toBeTruthy();
    expect(screen.getByRole("link", { name: /부산의 새벽/ }).getAttribute("href")).toBe(
      "/ko/photo?photo=1",
    );
    expect(document.querySelector("img")?.getAttribute("src")).toContain("photo-thumb.webp");
  });

  it("제목과 스니펫의 강조 세그먼트를 mark 로 렌더한다", () => {
    render(<SearchResults q="부산" lang="ko" groups={[photoGroup, blogGroup]} total={2} />);

    expect(screen.getByText("부산", { selector: "mark" })).toBeTruthy();
    expect(screen.getByText("수파베이스").tagName).toBe("MARK");
    // 스니펫은 태그(meta)를 대체하지 않는다.
    expect(screen.getByText("Firebase · 아키텍처")).toBeTruthy();
  });

  it("영어에서는 영문 사전 문구를 쓴다", () => {
    render(<SearchResults q="" lang="en" groups={[]} total={0} />);

    expect(screen.getByText(DICTIONARY.en.searchPrompt)).toBeTruthy();
  });
});
