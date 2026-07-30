import { describe, expect, it } from "vitest";

import { createSearchDocuments } from "@/features/search/_lib/search-documents";
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

  it("사진의 제목·장소·카메라·렌즈를 언어별 검색 텍스트에 포함한다", () => {
    const [document] = createSearchDocuments(sources);
    const source = sources.photos[0];

    expect(document.text.ko).toContain(source.title.ko);
    expect(document.text.ko).toContain(source.place.ko);
    expect(document.text.ko).toContain(source.camera);
    expect(document.text.ko).toContain(source.lens);
    expect(document.text.en).toContain(source.title.en);
    expect(document.text.en).toContain(source.place.en);
  });

  it("연주 프로그램과 프로젝트 기술 태그를 양쪽 언어 검색 텍스트에 포함한다", () => {
    const documents = createSearchDocuments(sources);
    const work = documents.find(
      ({ section, key }) => section === "music" && key.startsWith("work-"),
    );
    const project = documents.find(({ section }) => section === "dev");

    expect(work?.text.ko).toContain(sources.works[0].program[0]);
    expect(work?.text.en).toContain(sources.works[0].program[0]);
    expect(project?.text.ko).toContain(sources.projects[0].techTags[0]);
    expect(project?.text.en).toContain(sources.projects[0].techTags[0]);
  });

  it("한국어 검색 텍스트에 영문 번역을 섞지 않는다", () => {
    const [photoDocument] = createSearchDocuments(sources);

    expect(photoDocument.text.ko).not.toContain(sources.photos[0].title.en);
    expect(photoDocument.text.en).not.toContain(sources.photos[0].title.ko);
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
