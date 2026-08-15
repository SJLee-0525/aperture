import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchDevArticleById, toDevArticle } from "@/lib/supabase/public/dev-articles";

describe("toDevArticle — 날짜 계약", () => {
  it("발행 필드는 값이 있을 때만 Date 가 된다", () => {
    const article = toDevArticle("a1", {
      slug: "chunking",
      publishedAt: "2026-08-01T00:00:00.000Z",
      firstPublishedAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    });

    expect(article.publishedAt?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(article.firstPublishedAt?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(article.createdAt.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(article.updatedAt.toISOString()).toBe("2026-08-02T00:00:00.000Z");
  });

  it("초안의 발행 필드는 epoch 폴백 없이 null 을 보존한다", () => {
    const article = toDevArticle("a1", { slug: "" });

    expect(article.publishedAt).toBeNull();
    expect(article.firstPublishedAt).toBeNull();
    // createdAt·updatedAt 은 항상 Date 계약이라 누락 시 epoch 로 폴백한다.
    expect(article.createdAt.getTime()).toBe(0);
    expect(article.updatedAt.getTime()).toBe(0);
  });

  it("빈 문서도 기본값으로 정규화된다", () => {
    const article = toDevArticle("a1", {});

    expect(article.slug).toBe("");
    expect(article.title).toEqual({ ko: "", en: "" });
    expect(article.body).toBe("");
    expect(article.cover).toBeNull();
    expect(article.coverAlt).toBeNull();
    expect(article.tags).toEqual([]);
    expect(article.relatedProjectIds).toEqual([]);
    expect(article.published).toBe(false);
  });
});

describe("fetchDevArticleById — 행 병합", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("행 스칼라가 단일 출처다 — data 의 구형 slug·updatedAt 잔존값을 무시한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "a1",
            published: true,
            slug: "current-slug",
            published_at: "2026-08-01T00:00:00.000Z",
            created_at: "2026-06-01T00:00:00.000Z",
            updated_at: "2026-08-02T00:00:00.000Z",
            data: {
              slug: "stale-slug",
              updatedAt: "1999-01-01T00:00:00.000Z",
              firstPublishedAt: "2026-07-01T00:00:00.000Z",
              body: "# 본문",
            },
          },
        ],
      }),
    );

    const article = await fetchDevArticleById("a1");

    expect(article?.slug).toBe("current-slug");
    expect(article?.updatedAt.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    // firstPublishedAt 은 스칼라 컬럼이 없어 data 값이 그대로 살아야 한다.
    expect(article?.firstPublishedAt?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(article?.body).toBe("# 본문");
  });
});
