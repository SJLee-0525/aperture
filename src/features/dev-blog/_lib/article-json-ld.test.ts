import { describe, expect, it } from "vitest";

import { buildArticleJsonLd } from "@/features/dev-blog/_lib/article-json-ld";

import type { DevArticle } from "@/types/dev-article";

const article: DevArticle = {
  id: "a1",
  slug: "a1",
  title: { ko: "한국어 제목", en: "English title" },
  summary: { ko: "한국어 요약", en: "English summary" },
  body: "본문",
  cover: null,
  coverAlt: null,
  tags: ["css"],
  relatedProjectIds: [],
  published: true,
  publishedAt: new Date("2026-05-01T09:00:00+09:00"),
  firstPublishedAt: new Date("2026-05-01T09:00:00+09:00"),
  createdAt: new Date("2026-04-28T09:00:00+09:00"),
  updatedAt: new Date("2026-05-03T09:00:00+09:00"),
};

const build = (overrides: Partial<Parameters<typeof buildArticleJsonLd>[0]> = {}) =>
  buildArticleJsonLd({
    article,
    canonicalUrl: "https://example.com/ko/dev/articles/a1",
    imageUrl: null,
    tagLabels: ["CSS"],
    ...overrides,
  });

describe("buildArticleJsonLd", () => {
  it("한국어 원문 기준으로 신고한다", () => {
    const jsonLd = build();

    expect(jsonLd["@type"]).toBe("BlogPosting");
    expect(jsonLd.headline).toBe("한국어 제목");
    expect(jsonLd.description).toBe("한국어 요약");
    expect(jsonLd.inLanguage).toBe("ko");
  });

  it("canonical 주소를 url 과 mainEntityOfPage 양쪽에 쓴다", () => {
    const jsonLd = build();

    expect(jsonLd.url).toBe("https://example.com/ko/dev/articles/a1");
    expect(jsonLd.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": "https://example.com/ko/dev/articles/a1",
    });
  });

  it("발행일과 수정일을 ISO 로 넣는다", () => {
    const jsonLd = build();

    expect(jsonLd.datePublished).toBe(article.publishedAt?.toISOString());
    expect(jsonLd.dateModified).toBe(article.updatedAt.toISOString());
  });

  it("대표 이미지와 태그는 있을 때만 넣는다", () => {
    expect("image" in build()).toBe(false);
    expect(build({ imageUrl: "https://example.com/cover.png" }).image).toEqual([
      "https://example.com/cover.png",
    ]);
    expect("keywords" in build({ tagLabels: [] })).toBe(false);
  });

  it("본문을 싣지 않는다", () => {
    expect("articleBody" in build()).toBe(false);
  });
});
