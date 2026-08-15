import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPublishedDevArticles: vi.fn(),
  fetchDevArticleTags: vi.fn(),
}));

vi.mock("@/lib/supabase/public/dev-articles", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/public/dev-articles")>(
    "@/lib/supabase/public/dev-articles",
  );
  return {
    ...actual,
    fetchPublishedDevArticles: mocks.fetchPublishedDevArticles,
    fetchDevArticleTags: mocks.fetchDevArticleTags,
  };
});

import { getRagSourceDataForTarget } from "@/lib/content/rag-source";

import { MOCK_DEV_ARTICLE_TAGS } from "@/mocks/dev-article-tags";

/** 대상 행을 그대로 돌려주는 PostgREST 응답. `null` 은 삭제된 글(빈 배열)이다. */
const stubPostgrest = (row: Record<string, unknown> | null) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => (row ? [row] : []) }),
  );
};

describe("getRagSourceDataForTarget — 블로그 글", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    mocks.fetchDevArticleTags.mockResolvedValue(MOCK_DEV_ARTICLE_TAGS);
  });

  it("공개된 글은 태그 사전과 함께 돌려준다", async () => {
    stubPostgrest({
      id: "a1",
      published: true,
      slug: "chunking",
      published_at: "2026-08-01T00:00:00Z",
      data: { body: "# 본문" },
    });

    const data = await getRagSourceDataForTarget(
      { sourceType: "article", sourceId: "a1" },
      "token",
    );

    expect(data.devArticles.map(({ id, slug }) => ({ id, slug }))).toEqual([
      { id: "a1", slug: "chunking" },
    ]);
    expect(data.devArticleTags).toEqual(MOCK_DEV_ARTICLE_TAGS);
    // 다른 컬렉션은 이 타깃의 범위 밖이라 비어 있어야 한다.
    expect(data.devProjects).toEqual([]);
    expect(data.photos).toEqual([]);
  });

  it("초안은 빈 결과라 청크가 지워진다", async () => {
    stubPostgrest({ id: "a1", published: false, slug: "", published_at: null, data: {} });

    const data = await getRagSourceDataForTarget(
      { sourceType: "article", sourceId: "a1" },
      "token",
    );

    expect(data.devArticles).toEqual([]);
  });

  it("삭제된 글도 빈 결과다", async () => {
    stubPostgrest(null);

    const data = await getRagSourceDataForTarget(
      { sourceType: "article", sourceId: "gone" },
      "token",
    );

    expect(data.devArticles).toEqual([]);
  });
});
