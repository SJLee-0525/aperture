import { describe, expect, it } from "vitest";

import { sortAdminArticles } from "@/features/admin-dev-articles/_lib/dev-article-sort";

import type { AdminDevArticleListItem } from "@/types/admin";

const item = (
  id: string,
  publishedAt: string | null,
  updatedAt: string,
  overrides: Partial<AdminDevArticleListItem> = {},
): AdminDevArticleListItem => ({
  id,
  slug: id,
  title: { ko: `제목 ${id}`, en: `Title ${id}` },
  tags: [],
  published: publishedAt !== null,
  publishedAt: publishedAt ? new Date(publishedAt) : null,
  updatedAt: new Date(updatedAt),
  ...overrides,
});

describe("sortAdminArticles", () => {
  it("초안을 발행 글보다 위에 둔다", () => {
    const sorted = sortAdminArticles([
      item("published", "2026-05-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z"),
      item("draft", null, "2026-01-01T00:00:00.000Z"),
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["draft", "published"]);
  });

  it("초안끼리는 최근에 고친 순이다", () => {
    const sorted = sortAdminArticles([
      item("old", null, "2026-01-01T00:00:00.000Z"),
      item("new", null, "2026-08-01T00:00:00.000Z"),
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["new", "old"]);
  });

  it("발행 글은 발행일 내림차순이다", () => {
    const sorted = sortAdminArticles([
      item("older", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
      item("newer", "2026-06-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z"),
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["newer", "older"]);
  });

  it("같은 발행일에는 id 오름차순을 쓴다", () => {
    const sorted = sortAdminArticles([
      item("b", "2026-01-20T10:00:00.000Z", "2026-01-20T10:00:00.000Z"),
      item("a", "2026-01-20T10:00:00.000Z", "2026-01-20T10:00:00.000Z"),
    ]);

    expect(sorted.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const items = [
      item("published", "2026-05-01T00:00:00.000Z", "2026-05-01T00:00:00.000Z"),
      item("draft", null, "2026-01-01T00:00:00.000Z"),
    ];
    sortAdminArticles(items);

    expect(items.map((row) => row.id)).toEqual(["published", "draft"]);
  });
});
