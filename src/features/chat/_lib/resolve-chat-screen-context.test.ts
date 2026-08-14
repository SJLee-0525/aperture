import { describe, expect, it, vi } from "vitest";

import {
  buildScreenContextLookup,
  MAX_SCREEN_CONTEXT_CHARS,
  resolveScreenContext,
} from "@/features/chat/_lib/resolve-chat-screen-context";

import { MOCK_DEV_PROJECTS } from "@/mocks/dev";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";
import { MOCK_MUSIC_AWARDS, MOCK_MUSIC_WORKS } from "@/mocks/music";
import { MOCK_PHOTOS } from "@/mocks/photos";

const source = {
  photos: MOCK_PHOTOS,
  musicWorks: MOCK_MUSIC_WORKS,
  musicAwards: MOCK_MUSIC_AWARDS,
  devProjects: MOCK_DEV_PROJECTS,
  articles: MOCK_DEV_ARTICLES.filter(({ published }) => published).map(
    ({ id, slug, title, summary, cover, tags, publishedAt }) => ({
      id,
      slug,
      title,
      summary,
      cover,
      tags,
      publishedAt,
    }),
  ),
};

const lookup = buildScreenContextLookup(source, "ko");

describe("buildScreenContextLookup", () => {
  it("사진은 제목·장소·장비·짧은 EXIF·촬영일을 담는다", () => {
    const entry = lookup.photo.p01;

    expect(entry).toContain("Photo: 새벽의 항구");
    expect(entry).toContain("place: 도쿄 미나토구");
    expect(entry).toContain("camera: Sony α7 IV");
    expect(entry).toContain("aperture: f/2.8");
    expect(entry).toContain("shutter: 1/500");
    expect(entry).toContain("iso: 100");
    expect(entry).toContain("focal length: 24 mm");
    expect(entry).toContain("shot on: 2026-05-02");
  });

  it("연주는 제목·날짜·장소·프로그램을 담는다", () => {
    const entry = lookup.work.winterreise;

    expect(entry).toContain("Performance:");
    expect(entry).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    expect(entry).toContain("venue:");
    expect(entry).toContain("program:");
  });

  it("수상은 연도·수상명·순위를 담는다", () => {
    const entry = lookup.award["geneva-2024"];

    expect(entry).toContain("Music award:");
    expect(entry).toContain("year: 2024");
  });

  it("프로젝트는 요약·역할·기술·성과를 담고 트러블슈팅 전문은 제외한다", () => {
    const entry = lookup.project.portfolio;

    expect(entry).toContain("Project:");
    expect(entry).toContain("summary:");
    expect(entry).toContain("role:");
    expect(entry).toContain("tech:");
    expect(entry).not.toContain("problem");
    expect(entry).not.toContain("solution");
  });

  it("영어 문맥은 영어 필드를 선택한다", () => {
    const english = buildScreenContextLookup(source, "en");

    expect(english.photo.p01).toContain("Photo: Harbor at Dawn");
    expect(english.photo.p01).toContain("place: Minato, Tokyo");
  });

  it("published=false 항목은 lookup에 넣지 않는다", () => {
    const withPrivate = buildScreenContextLookup(
      {
        ...source,
        photos: [{ ...MOCK_PHOTOS[0], id: "hidden", published: false }],
      },
      "ko",
    );

    expect(withPrivate.photo.hidden).toBeUndefined();
  });
});

describe("resolveScreenContext", () => {
  const deps = { getScreenLookup: () => Promise.resolve(lookup) };

  it("openTarget이 없으면 lookup을 로드하지 않고 undefined", async () => {
    const getScreenLookup = vi.fn(deps.getScreenLookup);

    await expect(resolveScreenContext(undefined, { getScreenLookup })).resolves.toBeUndefined();
    expect(getScreenLookup).not.toHaveBeenCalled();
  });

  it("정상 id는 SCREEN_CONTEXT 블록을 만든다", async () => {
    const block = await resolveScreenContext({ type: "photo", id: "p01" }, deps);

    expect(block).toContain("# SCREEN_CONTEXT");
    expect(block).toContain("currently has this item open");
    expect(block).toContain("새벽의 항구");
    expect(block!.length).toBeLessThanOrEqual(MAX_SCREEN_CONTEXT_CHARS);
  });

  it("fresh lookup을 우선해 오래된 캐시의 같은 id를 덮어쓴다", async () => {
    const getFreshScreenLookup = vi.fn(() =>
      Promise.resolve(
        buildScreenContextLookup(
          {
            ...source,
            photos: [
              {
                ...MOCK_PHOTOS[0],
                place: { ko: "일산 호수공원", en: "Ilsan Lake Park" },
              },
            ],
          },
          "ko",
        ),
      ),
    );

    const block = await resolveScreenContext(
      { type: "photo", id: "p01" },
      { ...deps, getFreshScreenLookup },
    );

    expect(block).toContain("# SCREEN_CONTEXT");
    expect(block).toContain("place: 일산 호수공원");
    expect(block).not.toContain("place: 도쿄 미나토구");
    expect(getFreshScreenLookup).toHaveBeenCalledTimes(1);
  });

  it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
    "프로토타입 키 %s를 id로 받아도 상속 프로퍼티를 항목으로 오인하지 않는다",
    async (id) => {
      await expect(resolveScreenContext({ type: "photo", id }, deps)).resolves.toBeUndefined();
    },
  );

  it("fresh에도 없으면 undefined — 채팅은 문맥 없이 계속된다", async () => {
    await expect(
      resolveScreenContext(
        { type: "project", id: "no-such-project" },
        { ...deps, getFreshScreenLookup: () => Promise.resolve(lookup) },
      ),
    ).resolves.toBeUndefined();
  });

  it("fresh lookup이 실패하면 캐시 항목으로 답변을 계속한다", async () => {
    const getFreshScreenLookup = vi.fn(() => Promise.reject(new Error("firestore unavailable")));

    const block = await resolveScreenContext(
      { type: "work", id: "winterreise" },
      { ...deps, getFreshScreenLookup },
    );

    expect(block).toContain("Performance:");
    expect(getFreshScreenLookup).toHaveBeenCalledTimes(1);
  });
});
