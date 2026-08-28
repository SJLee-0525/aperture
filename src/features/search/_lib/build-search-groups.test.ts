import { describe, expect, it } from "vitest";

import { buildSearchGroups } from "@/features/search/_lib/build-search-groups";

import { DICTIONARY } from "@/constants/dictionary";
import { choseongOf } from "@/lib/text/choseong";
import { normalizeForSearch } from "@/lib/text/korean-tokenize";

import type { Group, Hit } from "@/features/search/_lib/build-search-groups";
import type { ArticleBodyMatch } from "@/features/search/_lib/search-article-bodies";
import type { Lang } from "@/types/lang";
import type { SearchDocument } from "@/types/search";

/**
 * 서버(search-documents)와 같은 정규화 경로로 픽스처 인덱스를 만든다.
 */
const indexFor = (title: string, body = "") => ({
  title: normalizeForSearch(title),
  body: normalizeForSearch(body),
  choseong: choseongOf(`${title} ${body}`),
});

const documents: SearchDocument[] = [
  {
    // 본문에만 "부산" 이 있다. 제목 매치인 photo-1 보다 배열은 앞서지만 랭킹은 밀려야 한다.
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
    key: "proj-1",
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

const build = (query: string, options?: { lang?: Lang; bodyMatches?: ArticleBodyMatch[] }) =>
  buildSearchGroups({
    documents,
    bodyMatches: options?.bodyMatches ?? [],
    query,
    lang: options?.lang ?? "ko",
  });

const groupOf = (groups: Group[], key: Group["key"]) => groups.find((group) => group.key === key);

const keysOf = (groups: Group[], key: Group["key"]) =>
  groupOf(groups, key)?.hits.map((hit) => hit.key) ?? [];

const textOf = (segments: Hit["titleSegments"]) => segments.map((segment) => segment.text).join("");

describe("buildSearchGroups", () => {
  it("검색어가 없으면 빈 결과를 돌려준다", () => {
    expect(build("")).toEqual({ groups: [], total: 0 });
  });

  it("검색어와 일치하는 문서만 담는다", () => {
    const { groups, total } = build("부산");

    expect(keysOf(groups, "photo")).toContain("photo-1");
    expect(keysOf(groups, "dev")).not.toContain("proj-1");
    expect(total).toBe(groups.reduce((count, group) => count + group.hits.length, 0));
  });

  it("그룹 순서는 개발·블로그·사진·음악으로 고정된다", () => {
    // 두 토큰 질의라 각 문서가 한쪽만 맞혀도 일치율 0.5 로 임계값을 넘어 네 그룹이 모두 나온다.
    const { groups } = build("겨울 포트폴리오");

    expect(groups.map((group) => group.label)).toEqual([
      DICTIONARY.ko.sectionDev,
      DICTIONARY.ko.devArticlesNav,
      DICTIONARY.ko.sectionPhoto,
      DICTIONARY.ko.sectionMusic,
    ]);
  });

  it("블로그 그룹은 개발 액센트를 쓰되 목록은 따로 묶는다", () => {
    const { groups } = build("포트폴리오");
    const blog = groupOf(groups, "blog");

    expect(blog?.section).toBe("dev");
    expect(blog?.hits[0]?.key).toBe("article-1");
    expect(blog?.hits[0]?.meta).toBe("Firebase · 아키텍처");
  });

  it("그룹 안에서 제목 매치가 본문 매치보다 위에 온다", () => {
    const photo = keysOf(build("부산").groups, "photo");

    expect(photo.indexOf("photo-1")).toBeGreaterThanOrEqual(0);
    expect(photo.indexOf("photo-1")).toBeLessThan(photo.indexOf("photo-harbor"));
  });

  it("제목의 매치 구간을 강조 세그먼트로 나눈다", () => {
    const hit = groupOf(build("부산").groups, "photo")?.hits.find(({ key }) => key === "photo-1");

    expect(hit?.titleSegments).toContainEqual({ text: "부산", hit: true });
    expect(textOf(hit?.titleSegments ?? [])).toBe("부산의 새벽");
  });

  it("앨범 결과에는 장소 대신 앨범 메타 라벨을 넣는다", () => {
    const hit = groupOf(build("서울").groups, "photo")?.hits.find(({ key }) => key === "album-1");

    expect(hit?.meta).toBe(DICTIONARY.ko.albumsNav);
  });

  it("한글 장비 브랜드 검색이 영문 카메라 모델이 든 사진에 닿는다", () => {
    const photo = keysOf(build("캐논").groups, "photo");

    expect(photo).toContain("photo-2");
    expect(photo).not.toContain("photo-1");
  });

  it.each([
    ["lake", "photo", "photo-lake", "/photo?photo=lake"],
    ["리액트", "dev", "proj-1", "/dev/projects?project=1"],
    ["piano", "music", "work-piano", "/music?work=piano"],
  ] as const)("분야별 이중언어 검색어를 결과에 연결한다: %s", (query, groupKey, key, href) => {
    const hit = groupOf(build(query).groups, groupKey)?.hits.find((item) => item.key === key);

    expect(hit?.href).toBe(href);
  });

  it("자모만 친 질의는 초성 검색으로 동작한다", () => {
    const photo = keysOf(build("ㅂㅅ").groups, "photo");

    expect(photo).toContain("photo-1");
    expect(photo).toContain("photo-harbor");
    expect(photo).not.toContain("photo-2");
    expect(photo).not.toContain("photo-lake");
  });

  it("일치하는 문서가 없으면 빈 결과다", () => {
    expect(build("제주")).toEqual({ groups: [], total: 0 });
  });

  it("영어에서는 영문 제목과 영문 라벨을 쓴다", () => {
    const { groups } = build("react", { lang: "en" });
    const dev = groupOf(groups, "dev");

    expect(dev?.label).toBe(DICTIONARY.en.sectionDev);
    expect(textOf(dev?.hits[0]?.titleSegments ?? [])).toBe("Portfolio");
  });
});

describe("buildSearchGroups — 본문 일치", () => {
  it("인덱스에 없는 질의라도 본문 일치 글을 스니펫과 함께 담는다", () => {
    const { groups } = build("수파베이스", {
      bodyMatches: [{ id: "1", snippet: "…수파베이스로 옮긴 이유는…" }],
    });
    const hit = groupOf(groups, "blog")?.hits[0];

    expect(hit?.key).toBe("article-1");
    expect(hit?.snippetSegments).toContainEqual({ text: "수파베이스", hit: true });
    // 스니펫은 태그(meta)를 대체하지 않는다.
    expect(hit?.meta).toBe("Firebase · 아키텍처");
  });

  it("가장자리 말줄임표는 강조 대상에서 분리한다", () => {
    const { groups } = build("수파베이스", {
      bodyMatches: [{ id: "1", snippet: "…수파베이스로 옮긴 이유는…" }],
    });
    const segments = groupOf(groups, "blog")?.hits[0]?.snippetSegments ?? [];

    expect(segments[0]).toEqual({ text: "…", hit: false });
    expect(segments[segments.length - 1]).toEqual({ text: "…", hit: false });
  });

  it("인덱스 매치와 같은 글이면 본문 일치를 중복으로 넣지 않는다", () => {
    const { groups } = build("firebase", {
      bodyMatches: [{ id: "1", snippet: "본문 일치" }],
    });

    expect(keysOf(groups, "blog")).toEqual(["article-1"]);
  });

  it("본문 일치는 인덱스 매치 아래에 놓인다", () => {
    const { groups } = build("포트폴리오", {
      bodyMatches: [{ id: "1", snippet: "본문 일치" }],
    });
    const blog = groupOf(groups, "blog");

    expect(blog?.hits[0]?.score).toBeGreaterThan(0);
    expect(blog?.hits[0]?.snippetSegments).toBeUndefined();
  });
});
