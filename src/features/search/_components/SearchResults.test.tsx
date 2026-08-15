// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SearchResults } from "@/features/search/_components/SearchResults";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { DICTIONARY } from "@/constants/dictionary";
import { choseongOf } from "@/lib/text/choseong";
import { normalizeForSearch } from "@/lib/text/korean-tokenize";

import type { SearchDocument } from "@/types/search";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

const useLangMock = vi.mocked(useLang);
const useSearchParamsMock = vi.mocked(useSearchParams);

/**
 * 서버(search-documents)와 같은 정규화 경로로 픽스처 인덱스를 만든다.
 *
 * @param {string} title
 * @param {string} [body]
 * @returns {{ title: string; body: string; choseong: string }}
 */
const indexFor = (title: string, body = "") => ({
  title: normalizeForSearch(title),
  body: normalizeForSearch(body),
  choseong: choseongOf(`${title} ${body}`),
});

const documents: SearchDocument[] = [
  {
    // 본문에만 "부산" — 제목 매치인 photo-1보다 배열은 앞서지만 랭킹은 밀려야 한다.
    key: "photo-harbor",
    section: "photo",
    title: { ko: "항구 풍경", en: "Harbor Scene" },
    index: indexFor("항구 풍경 Harbor Scene", "부산 야경 Busan night"),
    meta: { ko: "부산항", en: "Busan Port" },
    href: "/photo?photo=harbor",
  },
  {
    key: "photo-1",
    section: "photo",
    title: { ko: "부산의 새벽", en: "Dawn in Busan" },
    index: indexFor("부산의 새벽 Dawn in Busan", "부산 항구 소니 Busan harbor Sony"),
    meta: { ko: "부산", en: "Busan" },
    imageUrl: "/photo-thumb.webp",
    href: "/photo?photo=1",
  },
  {
    key: "album-1",
    section: "photo",
    title: { ko: "도시의 밤", en: "City Nights" },
    index: indexFor("도시의 밤 City Nights", "서울 야경 Seoul night"),
    metaLabel: "albums",
    href: "/photo/albums/city",
  },
  {
    key: "photo-2",
    section: "photo",
    title: { ko: "겨울 바다", en: "Winter Sea" },
    index: indexFor("겨울 바다 Winter Sea", "강릉 Gangneung Canon EOS R6 RF 24-70mm"),
    meta: { ko: "강릉", en: "Gangneung" },
    href: "/photo?photo=2",
  },
  {
    key: "project-1",
    section: "dev",
    title: { ko: "포트폴리오", en: "Portfolio" },
    index: indexFor("포트폴리오 Portfolio", "리액트 개발 React development"),
    meta: { ko: "웹", en: "Web" },
    href: "/dev/projects?project=1",
  },
  {
    key: "photo-lake",
    section: "photo",
    title: { ko: "고요한 저녁", en: "" },
    index: indexFor("고요한 저녁", "광교호수공원"),
    meta: { ko: "광교호수공원", en: "" },
    href: "/photo?photo=lake",
  },
  {
    key: "article-1",
    section: "dev",
    subsection: "blog",
    title: { ko: "포트폴리오를 서버 없이", en: "Portfolio without a server" },
    index: indexFor("포트폴리오를 서버 없이 Portfolio without a server", "firebase Firebase"),
    meta: { ko: "Firebase · 아키텍처", en: "Firebase · Architecture" },
    href: "/dev/articles/serverless",
  },
  {
    key: "work-piano",
    section: "music",
    title: { ko: "겨울 독주회", en: "" },
    index: indexFor("겨울 독주회", "피아노 독주회"),
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
    // 본문 일치 fetch 기본 대역 — 각 테스트가 필요하면 응답을 덮어쓴다.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ matches: [] }) }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("검색어가 없으면 검색 안내를 보여준다", () => {
    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("heading", { name: DICTIONARY.ko.searchPlaceholder })).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.searchPrompt)).toBeTruthy();
  });

  it("검색어와 일치하는 결과를 섹션별로 보여준다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EB%B6%80%EC%82%B0") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("heading", { name: "“부산”" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /부산의 새벽/ }).getAttribute("href")).toBe(
      "/ko/photo?photo=1",
    );
    expect(screen.getByText(DICTIONARY.ko.sectionPhoto)).toBeTruthy();
    expect(document.querySelector("img")?.getAttribute("src")).toContain("photo-thumb.webp");
    expect(screen.queryByText("포트폴리오")).toBeNull();
  });

  it("그룹 순서는 개발·블로그·사진·음악으로 고정된다", () => {
    useSearchParamsMock.mockReturnValue(
      // 두 토큰 질의 — 각 문서가 한쪽만 맞혀도 일치율 0.5 라 임계값을 넘어 네 그룹이 모두 나온다.
      new URLSearchParams("q=겨울 포트폴리오") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    const labels = [...document.querySelectorAll("section .u-label")].map(
      (node) => node.textContent,
    );
    expect(labels).toEqual([
      DICTIONARY.ko.sectionDev,
      DICTIONARY.ko.devArticlesNav,
      DICTIONARY.ko.sectionPhoto,
      DICTIONARY.ko.sectionMusic,
    ]);
  });

  it("블로그 결과는 개발 액센트를 쓰되 목록은 따로 묶는다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4") as ReturnType<
        typeof useSearchParams
      >,
    );

    render(<SearchResults documents={documents} />);

    const blogGroup = [...document.querySelectorAll("section")].find((node) =>
      node.textContent?.includes(DICTIONARY.ko.devArticlesNav),
    );
    expect(blogGroup?.getAttribute("data-section")).toBe("dev");
    expect(blogGroup?.textContent).toContain("Firebase · 아키텍처");
  });

  it("그룹 안에서 제목 매치가 본문 매치보다 위에 온다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EB%B6%80%EC%82%B0") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    const titles = screen.getAllByRole("link").map((link) => link.textContent ?? "");
    const titleMatch = titles.findIndex((text) => text.includes("부산의 새벽"));
    const bodyMatch = titles.findIndex((text) => text.includes("항구 풍경"));
    expect(titleMatch).toBeGreaterThanOrEqual(0);
    expect(bodyMatch).toBeGreaterThanOrEqual(0);
    expect(titleMatch).toBeLessThan(bodyMatch);
  });

  it("제목의 매치 구간을 하이라이트한다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EB%B6%80%EC%82%B0") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    const link = screen.getByRole("link", { name: /부산의 새벽/ });
    expect(link.querySelector("mark")?.textContent).toBe("부산");
  });

  it("앨범 결과에는 장소 대신 앨범 메타 라벨을 보여준다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EC%84%9C%EC%9A%B8") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("link", { name: /도시의 밤/ })).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.albumsNav)).toBeTruthy();
  });

  it("한글 장비 브랜드 검색으로 영문 카메라 모델이 포함된 사진을 찾는다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EC%BA%90%EB%85%BC") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("link", { name: /겨울 바다/ }).getAttribute("href")).toBe(
      "/ko/photo?photo=2",
    );
    expect(screen.queryByRole("link", { name: /부산의 새벽/ })).toBeNull();
  });

  it.each([
    ["lake", "고요한 저녁", "/ko/photo?photo=lake"],
    ["리액트", "포트폴리오", "/ko/dev/projects?project=1"],
    ["piano", "겨울 독주회", "/ko/music?work=piano"],
  ])("분야별 이중언어 검색어를 결과에 연결한다: %s", (query, title, href) => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({ q: query }) as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("link", { name: new RegExp(title) }).getAttribute("href")).toBe(href);
  });

  it("자모만 친 질의는 초성 검색으로 결과를 찾는다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%E3%85%82%E3%85%85") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    // "ㅂㅅ" → 부산의 새벽(제목 초성)·항구 풍경(본문 "부산") 포함, 초성에 ㅂㅅ 없는 문서는 제외.
    expect(screen.getByRole("link", { name: /부산의 새벽/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /항구 풍경/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /겨울 바다/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /고요한 저녁/ })).toBeNull();
  });

  it("일치하는 문서가 없으면 빈 결과 안내와 0건을 보여준다", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=%EC%A0%9C%EC%A3%BC") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByText(DICTIONARY.ko.searchEmpty)).toBeTruthy();
    expect(screen.getByText(DICTIONARY.ko.searchEmptyChatHint)).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("영어 선택 시 영문 제목과 메타를 표시한다", () => {
    useLangMock.mockReturnValue({
      lang: "en",
      dict: DICTIONARY.en,
      setLang: vi.fn(),
    });
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=react") as ReturnType<typeof useSearchParams>,
    );

    render(<SearchResults documents={documents} />);

    expect(screen.getByRole("link", { name: /Portfolio/ }).getAttribute("href")).toBe(
      "/en/dev/projects?project=1",
    );
    expect(screen.getByText(DICTIONARY.en.sectionDev)).toBeTruthy();
  });
});

describe("SearchResults — 본문 일치", () => {
  beforeEach(() => {
    useLangMock.mockReturnValue({
      lang: "ko",
      dict: DICTIONARY.ko,
      setLang: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("인덱스에 없는 질의라도 본문 일치 글을 스니펫과 함께 보여준다", async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=수파베이스") as ReturnType<typeof useSearchParams>,
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ matches: [{ id: "1", snippet: "…수파베이스로 옮긴 이유는…" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchResults documents={documents} />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /포트폴리오를 서버 없이/ })).toBeTruthy();
    });
    expect(screen.getByText("…수파베이스로 옮긴 이유는…")).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/search-body?q=%EC%88%98%ED%8C%8C%EB%B2%A0%EC%9D%B4%EC%8A%A4",
    );
  });

  it("인덱스 매치와 같은 글이면 본문 일치를 중복으로 넣지 않는다", async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=firebase") as ReturnType<typeof useSearchParams>,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ matches: [{ id: "1", snippet: "본문 일치" }] }),
      }),
    );

    render(<SearchResults documents={documents} />);

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /포트폴리오를 서버 없이/ })).toHaveLength(1);
    });
  });

  it("본문 일치 요청이 실패해도 인덱스 결과는 그대로 남는다", async () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("q=firebase") as ReturnType<typeof useSearchParams>,
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    render(<SearchResults documents={documents} />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /포트폴리오를 서버 없이/ })).toBeTruthy();
    });
  });
});
