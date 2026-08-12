import { describe, expect, it } from "vitest";

import {
  toDevArticleSummaries,
  toDevArticleSummary,
} from "@/features/dev-blog/_lib/article-projection";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

import type { DevArticle } from "@/types/dev-article";

const article = (overrides: Partial<DevArticle> = {}): DevArticle => ({
  id: "a1",
  slug: "a1",
  title: { ko: "제목", en: "Title" },
  summary: { ko: "요약", en: "Summary" },
  body: "본문 한 줄.",
  cover: null,
  coverAlt: null,
  tags: ["css"],
  relatedProjectIds: [],
  published: true,
  publishedAt: new Date("2026-05-01T09:00:00+09:00"),
  firstPublishedAt: new Date("2026-05-01T09:00:00+09:00"),
  createdAt: new Date("2026-04-28T09:00:00+09:00"),
  updatedAt: new Date("2026-05-01T09:00:00+09:00"),
  ...overrides,
});

describe("toDevArticleSummary", () => {
  it("본문을 싣지 않는다", () => {
    expect("body" in toDevArticleSummary(article())).toBe(false);
  });

  it("읽기 시간을 본문에서 세어 넣는다", () => {
    const summary = toDevArticleSummary(article());
    // 짧은 글도 하한 1분이다.
    expect(summary.readingMinutes).toBe(1);

    const long = toDevArticleSummary(article({ body: "가".repeat(3000) }));
    expect(long.readingMinutes).toBeGreaterThan(1);
  });

  it("대표 이미지가 없는 글도 그대로 통과한다", () => {
    const summary = toDevArticleSummary(article({ cover: null, coverAlt: null }));
    expect(summary.cover).toBeNull();
    expect(summary.coverAlt).toBeNull();
  });

  it("발행일이 비면 생성 시각을 쓴다", () => {
    const summary = toDevArticleSummary(article({ publishedAt: null }));
    expect(summary.publishedAt).toEqual(new Date("2026-04-28T09:00:00+09:00"));
  });
});

describe("toDevArticleSummaries", () => {
  it("입력 순서를 바꾸지 않는다", () => {
    const summaries = toDevArticleSummaries([article({ id: "b" }), article({ id: "a" })]);
    expect(summaries.map((summary) => summary.id)).toEqual(["b", "a"]);
  });

  it("mock 전체를 요약으로 바꿀 수 있다", () => {
    const summaries = toDevArticleSummaries(MOCK_DEV_ARTICLES);
    expect(summaries).toHaveLength(MOCK_DEV_ARTICLES.length);
    expect(summaries.every((summary) => summary.readingMinutes >= 1)).toBe(true);
  });
});
