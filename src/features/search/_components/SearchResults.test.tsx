// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DICTIONARY } from "@/constants/dictionary";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { SearchResults } from "@/features/search/_components/SearchResults";
import type { SearchDocument } from "@/features/search/_lib/search-documents";
import { useSearchParams } from "next/navigation";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

const useLangMock = vi.mocked(useLang);
const useSearchParamsMock = vi.mocked(useSearchParams);

const documents: SearchDocument[] = [
  {
    key: "photo-1",
    section: "photo",
    title: { ko: "부산의 새벽", en: "Dawn in Busan" },
    text: { ko: "부산 항구 소니", en: "Busan harbor Sony" },
    meta: { ko: "부산", en: "Busan" },
    imageUrl: "/photo-thumb.webp",
    href: "/photo?photo=1",
  },
  {
    key: "album-1",
    section: "photo",
    title: { ko: "도시의 밤", en: "City Nights" },
    text: { ko: "서울 야경", en: "Seoul night" },
    metaLabel: "albums",
    href: "/photo/albums/city",
  },
  {
    key: "photo-2",
    section: "photo",
    title: { ko: "겨울 바다", en: "Winter Sea" },
    text: { ko: "강릉 Canon EOS R6 RF 24-70mm", en: "Gangneung Canon EOS R6 RF 24-70mm" },
    meta: { ko: "강릉", en: "Gangneung" },
    href: "/photo?photo=2",
  },
  {
    key: "project-1",
    section: "dev",
    title: { ko: "포트폴리오", en: "Portfolio" },
    text: { ko: "리액트 개발", en: "React development" },
    meta: { ko: "웹", en: "Web" },
    href: "/dev/projects?project=1",
  },
  {
    key: "photo-lake",
    section: "photo",
    title: { ko: "고요한 저녁", en: "" },
    text: { ko: "고요한 저녁 광교호수공원", en: "" },
    meta: { ko: "광교호수공원", en: "" },
    href: "/photo?photo=lake",
  },
  {
    key: "work-piano",
    section: "music",
    title: { ko: "겨울 독주회", en: "" },
    text: { ko: "피아노 독주회", en: "" },
    href: "/music?work=piano",
  },
];

describe("SearchResults", () => {
  beforeEach(() => {
    useLangMock.mockReturnValue({
      lang: "ko",
      dict: DICTIONARY.ko,
      setLang: vi.fn(),
    });
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams() as ReturnType<typeof useSearchParams>,
    );
  });

  afterEach(cleanup);

  it("검색어가 없으면 검색 안내를 보여준다", () => {
    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("heading", { name: DICTIONARY.ko.searchPlaceholder })).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.searchPrompt)).toBeTruthy();
  });

  it("현재 언어의 검색 텍스트와 일치하는 결과를 섹션별로 보여준다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EB%B6%80%EC%82%B0") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("heading", { name: "“부산”" })).toBeTruthy();
    expect(screen.getByText("부산의 새벽").closest("a")?.getAttribute("href")).toBe(
      "/photo?photo=1",
    );
    expect(screen.getByText(DICTIONARY.ko.sectionPhoto)).toBeTruthy();
    expect(document.querySelector("img")?.getAttribute("src")).toContain("photo-thumb.webp");
    expect(screen.queryByText("포트폴리오")).toBeNull();
  });

  it("앨범 결과에는 장소 대신 앨범 메타 라벨을 보여준다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EC%84%9C%EC%9A%B8") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByText("도시의 밤").closest("a")).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.albumsNav)).toBeTruthy();
  });

  it("한글 장비 브랜드 검색으로 영문 카메라 모델이 포함된 사진을 찾는다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EC%BA%90%EB%85%BC") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByText("겨울 바다").closest("a")?.getAttribute("href")).toBe("/photo?photo=2");
    expect(screen.queryByText("부산의 새벽")).toBeNull();
  });

  it.each([
    ["lake", "고요한 저녁", "/photo?photo=lake"],
    ["리액트", "포트폴리오", "/dev/projects?project=1"],
    ["piano", "겨울 독주회", "/music?work=piano"],
  ])("분야별 이중언어 검색어를 결과에 연결한다: %s", (query, title, href) => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({ q: query }) as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByText(title).closest("a")?.getAttribute("href")).toBe(href);
  });

  it("일치하는 문서가 없으면 빈 결과 안내와 0건을 보여준다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EC%A0%9C%EC%A3%BC") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByText(DICTIONARY.ko.searchEmpty)).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("영어 선택 시 영문 텍스트로 검색하고 영문 제목과 메타를 표시한다", () => {
    useLangMock.mockReturnValue({
      lang: "en",
      dict: DICTIONARY.en,
      setLang: vi.fn(),
    });
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=react") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByText("Portfolio").closest("a")?.getAttribute("href")).toBe(
      "/dev/projects?project=1",
    );
    expect(screen.getByText(DICTIONARY.en.sectionDev)).toBeTruthy();
  });
});
