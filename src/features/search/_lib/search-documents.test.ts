import { describe, expect, it } from "vitest";

import { createSearchDocuments } from "@/features/search/_lib/search-documents";
import { choseongOf } from "@/lib/text/choseong";
import { normalizeForSearch, tokensFor } from "@/lib/text/korean-tokenize";
import { matchedTokenRatio } from "@/lib/text/token-match";
import { MOCK_ALBUMS } from "@/mocks/albums";
import { MOCK_DEV_PROJECTS } from "@/mocks/dev";
import { MOCK_MUSIC_AWARDS, MOCK_MUSIC_MEDIA, MOCK_MUSIC_WORKS } from "@/mocks/music";
import { MOCK_PHOTOS } from "@/mocks/photos";

const sources = {
  photos: [MOCK_PHOTOS[0]],
  albums: [MOCK_ALBUMS[0]],
  works: [MOCK_MUSIC_WORKS[0]],
  awards: [MOCK_MUSIC_AWARDS[0]],
  media: [MOCK_MUSIC_MEDIA[0]],
  projects: [MOCK_DEV_PROJECTS[0]],
};

/** 원문 텍스트의 토큰이 인덱스 문자열에 전부 담겼는지 — 클라 대조와 같은 경로로 검증. */
const containsAllTokensOf = (indexText: string, raw: string) =>
  matchedTokenRatio(tokensFor(raw), indexText) === 1;

describe("createSearchDocuments", () => {
  it("공개 콘텐츠를 사진·음악·개발 순서의 검색 문서로 투영한다", () => {
    expect(createSearchDocuments(sources).map(({ key, section }) => ({ key, section }))).toEqual([
      { key: `photo-${sources.photos[0].id}`, section: "photo" },
      { key: `album-${sources.albums[0].id}`, section: "photo" },
      { key: `work-${sources.works[0].id}`, section: "music" },
      { key: `award-${sources.awards[0].id}`, section: "music" },
      { key: `media-${sources.media[0].id}`, section: "music" },
      { key: `proj-${sources.projects[0].id}`, section: "dev" },
    ]);
  });

  it("각 콘텐츠가 상세 화면으로 이동하는 링크를 만든다", () => {
    const documents = createSearchDocuments(sources);

    expect(documents.map(({ href }) => href)).toEqual([
      `/photo?photo=${sources.photos[0].id}`,
      `/photo/albums/${sources.albums[0].id}`,
      `/music?work=${sources.works[0].id}`,
      `/music/career?award=${sources.awards[0].id}`,
      "/music/media",
      `/dev/projects?project=${sources.projects[0].id}`,
    ]);
  });

  it("이미지가 있는 콘텐츠에는 목록용 미리보기 URL을 포함한다", () => {
    const documents = createSearchDocuments(sources);

    expect(documents.find(({ key }) => key.startsWith("photo-"))?.imageUrl).toBe(
      sources.photos[0].image.thumbnail?.url ?? sources.photos[0].image.url,
    );
    expect(documents.find(({ key }) => key.startsWith("album-"))?.imageUrl).toBeTruthy();
    expect(documents.find(({ key }) => key.startsWith("work-"))?.imageUrl).toBe(
      sources.works[0].poster.thumbnail?.url ?? sources.works[0].poster.url,
    );
    expect(documents.find(({ key }) => key.startsWith("proj-"))?.imageUrl).toBe(
      sources.projects[0].cover?.thumbnail?.url ?? sources.projects[0].cover?.url ?? "",
    );
    expect(documents.find(({ key }) => key.startsWith("award-"))?.imageUrl).toBeUndefined();
  });

  it("사진 제목은 제목 인덱스에, 장소·카메라·렌즈는 본문 인덱스에 담는다", () => {
    const [document] = createSearchDocuments(sources);
    const source = sources.photos[0];

    expect(containsAllTokensOf(document.index.title, source.title.ko)).toBe(true);
    expect(containsAllTokensOf(document.index.title, source.title.en)).toBe(true);
    expect(containsAllTokensOf(document.index.body, source.place.ko)).toBe(true);
    expect(containsAllTokensOf(document.index.body, source.camera)).toBe(true);
    expect(containsAllTokensOf(document.index.body, source.lens)).toBe(true);
  });

  it("연주 프로그램과 프로젝트 기술 태그를 본문 인덱스에 포함한다", () => {
    const documents = createSearchDocuments(sources);
    const work = documents.find(
      ({ section, key }) => section === "music" && key.startsWith("work-"),
    );
    const project = documents.find(({ section }) => section === "dev");

    expect(containsAllTokensOf(work!.index.body, sources.works[0].program[0])).toBe(true);
    expect(containsAllTokensOf(project!.index.body, sources.projects[0].techTags[0])).toBe(true);
  });

  it("인덱스는 서버에서 정규화를 마친 문자열이다 — 클라 재정규화 없이 대조만 한다", () => {
    const [photoDocument] = createSearchDocuments(sources);
    const source = sources.photos[0];

    expect(photoDocument.index.title).toBe(
      normalizeForSearch(`${source.title.ko} ${source.title.en}`),
    );
  });

  it("한국어 제목·본문의 초성 나열을 인덱스에 담는다", () => {
    const [photoDocument] = createSearchDocuments(sources);
    const source = sources.photos[0];

    expect(photoDocument.index.choseong).toContain(choseongOf(source.title.ko));
    expect(photoDocument.index.choseong).toContain(choseongOf(source.place.ko));
  });

  it("빈 소스에서는 빈 검색 문서를 반환한다", () => {
    expect(
      createSearchDocuments({
        photos: [],
        albums: [],
        works: [],
        awards: [],
        media: [],
        projects: [],
      }),
    ).toEqual([]);
  });
});
