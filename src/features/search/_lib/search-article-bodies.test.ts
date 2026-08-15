import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDevArticles: vi.fn() }));

vi.mock("@/lib/content/dev-articles", () => ({ getDevArticles: mocks.getDevArticles }));

import { searchArticleBodies } from "@/features/search/_lib/search-article-bodies";

const articleOf = (id: string, body: string) => ({
  id,
  slug: id,
  title: { ko: "제목", en: "Title" },
  summary: { ko: "요약", en: "Summary" },
  body,
  cover: null,
  coverAlt: null,
  tags: [],
  relatedProjectIds: [],
  published: true,
  publishedAt: new Date("2026-08-01T00:00:00.000Z"),
  firstPublishedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchArticleBodies", () => {
  it("본문 일치 글의 id 와 일치 지점 스니펫을 돌려준다", async () => {
    mocks.getDevArticles.mockResolvedValue([
      articleOf("hit", `# 배경\n\n${"앞부분 설명. ".repeat(20)}수파베이스로 옮긴 이유를 정리한다.`),
      articleOf("miss", "다른 주제의 글."),
    ]);

    const matches = await searchArticleBodies("수파베이스");

    expect(matches.map(({ id }) => id)).toEqual(["hit"]);
    expect(matches[0].snippet).toContain("수파베이스로 옮긴 이유");
    // 일치 지점이 본문 중간이라 앞뒤 절단 말줄임표가 붙는다.
    expect(matches[0].snippet.startsWith("…")).toBe(true);
  });

  it("대소문자와 유니코드 표기 차이를 흡수한다", async () => {
    mocks.getDevArticles.mockResolvedValue([articleOf("a1", "PostgREST 로 공개 읽기를 옮겼다.")]);

    await expect(searchArticleBodies("postgrest")).resolves.toHaveLength(1);
  });

  it("2자 미만 질의는 글을 읽지 않고 빈 결과다", async () => {
    await expect(searchArticleBodies("ㅂ")).resolves.toEqual([]);
    expect(mocks.getDevArticles).not.toHaveBeenCalled();
  });

  it("링크 주소는 대조 대상이 아니다 — 평문은 라벨만 남긴다", async () => {
    mocks.getDevArticles.mockResolvedValue([
      articleOf("a1", "[문서](https://supabase.com/docs) 참고."),
    ]);

    await expect(searchArticleBodies("supabase.com")).resolves.toEqual([]);
    await expect(searchArticleBodies("문서")).resolves.toHaveLength(1);
  });
});
