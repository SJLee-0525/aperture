import { describe, expect, it, vi } from "vitest";

import {
  appendRagChunks,
  formatLinkVocabulary,
  formatProfileContext,
  formatProfileReferences,
  resolveReferencesWithRefresh,
  selectFormattedProfileContext,
} from "@/features/chat/_lib/build-profile-context";

import { MOCK_ALBUMS } from "@/mocks/albums";
import { MOCK_DEV_CONFIG, MOCK_DEV_PROJECTS } from "@/mocks/dev";
import {
  MOCK_MUSIC_AWARDS,
  MOCK_MUSIC_CONFIG,
  MOCK_MUSIC_MEDIA,
  MOCK_MUSIC_WORKS,
} from "@/mocks/music";
import { MOCK_PHOTOS } from "@/mocks/photos";
import { MOCK_SITE } from "@/mocks/site";

const data = {
  site: MOCK_SITE,
  devConfig: MOCK_DEV_CONFIG,
  devProjects: MOCK_DEV_PROJECTS,
  musicConfig: MOCK_MUSIC_CONFIG,
  musicWorks: MOCK_MUSIC_WORKS,
  musicAwards: MOCK_MUSIC_AWARDS,
  musicMedia: MOCK_MUSIC_MEDIA,
  photos: MOCK_PHOTOS,
  albums: MOCK_ALBUMS,
};

describe("formatProfileContext", () => {
  it("선택한 언어의 공개 콘텐츠와 실제 내부 경로를 결정적으로 직렬화한다", () => {
    const first = formatProfileContext(data, "ko");
    const second = formatProfileContext(data, "ko");

    expect(first).toBe(second);
    expect(first).toContain("# PROFILE_CONTEXT");
    expect(first).toContain("Name: 이성준");
    expect(first).toContain("url: /dev/projects?project=");
    expect(first).toContain("url: /photo?photo=");
    expect(first).toContain("camera: Sony α7 IV");
    expect(first).toContain("lens: FE 35mm F1.4 GM");
    expect(first).not.toContain("image.url");
    expect(first).not.toContain("fileName");
    expect(first).not.toContain("coords");
  });

  it("published=false 콘텐츠는 문맥에 포함하지 않는다", () => {
    const privateProject = {
      ...MOCK_DEV_PROJECTS[0],
      id: "private-project",
      title: { ko: "비공개 프로젝트", en: "Private project" },
      published: false,
    };
    const context = formatProfileContext(
      { ...data, devProjects: [...MOCK_DEV_PROJECTS, privateProject] },
      "ko",
    );

    expect(context).not.toContain("비공개 프로젝트");
    expect(context).not.toContain("private-project");
  });

  it("영어 문맥은 영어 필드를 선택한다", () => {
    const context = formatProfileContext(data, "en");

    expect(context).toContain("Name: Sungjoon Lee");
    expect(context).toContain("Photography bio: Quiet light in the city.");
  });

  it("선택한 프로필 섹션만 모델 문맥에 남긴다", () => {
    const context = selectFormattedProfileContext(formatProfileContext(data, "ko"), [
      "profile",
      "photography",
    ]);

    expect(context).toContain("## Profile");
    expect(context).toContain("## Photography");
    expect(context).not.toContain("## Development");
    expect(context).not.toContain("## Music");
  });

  it("사진·연주·프로젝트를 기존 모달 딥링크 카드로 투영한다", () => {
    const references = formatProfileReferences(data, "ko");

    expect(references.find(({ type }) => type === "photo")).toMatchObject({
      href: expect.stringContaining("/photo?photo="),
      image: expect.objectContaining({ url: expect.any(String) }),
    });
    expect(references.find(({ type }) => type === "music")).toMatchObject({
      href: expect.stringContaining("/music?work="),
    });
    expect(references.find(({ type }) => type === "project")).toMatchObject({
      href: expect.stringContaining("/dev/projects?project="),
    });
  });
});

describe("formatLinkVocabulary", () => {
  it("통제 태그 사전과 공개 사진 파생 카메라·id를 담는다", () => {
    const vocabulary = formatLinkVocabulary(data);

    expect(vocabulary.tags).toBe(data.site.tags);
    expect(vocabulary.cameras).toContain("Sony α7 IV");
    // dedupe — 같은 카메라가 여러 사진에 있어도 한 번만.
    expect(new Set(vocabulary.cameras).size).toBe(vocabulary.cameras.length);
    expect(vocabulary.photoIds).toContain("p01");
  });

  it("published=false 사진과 빈 카메라 문자열은 제외한다", () => {
    const vocabulary = formatLinkVocabulary({
      ...data,
      photos: [
        { ...data.photos[0], id: "no-camera", camera: "  " },
        { ...data.photos[1], id: "private", published: false },
      ],
    });

    expect(vocabulary.cameras).toEqual([]);
    expect(vocabulary.photoIds).toEqual(["no-camera"]);
  });
});

describe("appendRagChunks", () => {
  const chunk = {
    id: "musicAward:award-1:0",
    section: "music" as const,
    sourceType: "musicAward",
    sourceId: "award-1",
    chunkKey: "0",
    text: "2024 우수상 수상",
    embeddingModel: "text-embedding-3-small@512",
    published: true,
  };

  it("벡터 검색 청크를 섹션 요약 아래에 덧붙이고 요약은 유지한다", () => {
    const base = selectFormattedProfileContext(formatProfileContext(data, "ko"), [
      "profile",
      "development",
      "music",
    ]);
    const merged = appendRagChunks(base, [chunk]);

    expect(merged).toContain("## Development");
    expect(merged).toContain("## Music");
    expect(merged).toContain("## Highly Relevant Portfolio Context (Vector Search)");
    expect(merged).toContain("[musicAward:award-1] 2024 우수상 수상");
    expect(merged.indexOf("## Music")).toBeLessThan(merged.indexOf("Vector Search"));
  });

  it("검색 청크가 없으면 기존 문맥을 그대로 반환한다", () => {
    expect(appendRagChunks("# PROFILE_CONTEXT", [])).toBe("# PROFILE_CONTEXT");
  });
});

describe("resolveReferencesWithRefresh", () => {
  it("요청한 항목이 캐시에서 누락되면 최신 공개 reference로 복구한다", async () => {
    const freshPhoto = {
      type: "photo" as const,
      id: "dokdo-photo",
      title: "LSJ_3112",
      subtitle: "독도",
      href: "/photo?photo=dokdo-photo",
      image: null,
    };
    const loadFreshReferences = vi.fn().mockResolvedValue([freshPhoto]);

    await expect(
      resolveReferencesWithRefresh([{ type: "photo", id: "dokdo-photo" }], [], loadFreshReferences),
    ).resolves.toEqual([freshPhoto]);
    expect(loadFreshReferences).toHaveBeenCalledOnce();
  });

  it("캐시가 요청한 항목을 포함하면 최신 데이터를 다시 읽지 않는다", async () => {
    const cachedProject = {
      type: "project" as const,
      id: "project-1",
      title: "Project",
      subtitle: "Summary",
      href: "/dev/projects?project=project-1",
      image: null,
    };
    const loadFreshReferences = vi.fn();

    await expect(
      resolveReferencesWithRefresh(
        [{ type: "project", id: "project-1" }],
        [cachedProject],
        loadFreshReferences,
      ),
    ).resolves.toEqual([cachedProject]);
    expect(loadFreshReferences).not.toHaveBeenCalled();
  });

  it("mock reference가 없을 때 live refresh 함수 없이 빈 결과를 유지한다", async () => {
    await expect(
      resolveReferencesWithRefresh([{ type: "photo", id: "live-only-photo" }], []),
    ).resolves.toEqual([]);
  });
});
