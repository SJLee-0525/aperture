import { describe, expect, it } from "vitest";

import {
  formatProfileContext,
  formatProfileReferences,
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
