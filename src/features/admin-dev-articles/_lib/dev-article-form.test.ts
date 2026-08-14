import { describe, expect, it } from "vitest";

import {
  articleToInput,
  emptyArticleInput,
  prepareArticleInput,
} from "@/features/admin-dev-articles/_lib/dev-article-form";

import type { DevArticle } from "@/types/dev-article";

const COVER = { url: "https://example.test/a.webp", path: "dev-blog/a/1.webp", w: 2048, h: 1365 };

const article = (overrides: Partial<DevArticle> = {}): DevArticle => ({
  id: "a1",
  slug: "serverless-portfolio",
  title: { ko: "서버 없는 포트폴리오", en: "Serverless portfolio" },
  summary: { ko: "요약", en: "Summary" },
  body: "본문",
  cover: null,
  coverAlt: null,
  tags: ["nextjs"],
  relatedProjectIds: [],
  published: true,
  publishedAt: new Date("2026-01-20T10:00:00.000Z"),
  firstPublishedAt: new Date("2026-01-20T10:00:00.000Z"),
  createdAt: new Date("2026-01-19T00:00:00.000Z"),
  updatedAt: new Date("2026-01-21T00:00:00.000Z"),
  ...overrides,
});

describe("emptyArticleInput", () => {
  it("초안으로 시작한다", () => {
    const input = emptyArticleInput();

    expect(input.published).toBe(false);
    expect(input.publishedAt).toBeNull();
    expect(input.firstPublishedAt).toBeNull();
  });
});

describe("articleToInput", () => {
  it("문서 ID와 시스템 시각을 뺀다", () => {
    const input = articleToInput(article());

    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("createdAt");
    expect(input).not.toHaveProperty("updatedAt");
    expect(input.slug).toBe("serverless-portfolio");
  });
});

describe("prepareArticleInput", () => {
  it("slug 를 정규화한다", () => {
    const prepared = prepareArticleInput({ ...articleToInput(article()), slug: "새 글 Draft " });

    expect(prepared.slug).toBe("sae-geul-draft");
  });

  it("이미 발행한 글의 slug 변경을 되돌린다", () => {
    const previous = article();
    const prepared = prepareArticleInput(
      { ...articleToInput(previous), slug: "다른-주소" },
      previous,
    );

    expect(prepared.slug).toBe("serverless-portfolio");
  });

  it("발행한 적 없는 글은 slug 를 바꿀 수 있다", () => {
    const previous = article({ published: false, publishedAt: null, firstPublishedAt: null });
    const prepared = prepareArticleInput(
      { ...articleToInput(previous), slug: "new-note" },
      previous,
    );

    expect(prepared.slug).toBe("new-note");
  });

  it("제목·요약의 앞뒤 공백을 지운다", () => {
    const prepared = prepareArticleInput({
      ...articleToInput(article()),
      title: { ko: "  제목  ", en: "  Title  " },
      summary: { ko: " 요약 ", en: " Summary " },
    });

    expect(prepared.title).toEqual({ ko: "제목", en: "Title" });
    expect(prepared.summary).toEqual({ ko: "요약", en: "Summary" });
  });

  it("태그와 연관 프로젝트의 중복·빈 값을 정리하고 순서를 지킨다", () => {
    const prepared = prepareArticleInput({
      ...articleToInput(article()),
      tags: ["nextjs", " ", "nextjs", "css"],
      relatedProjectIds: ["aperture", "aperture", ""],
    });

    expect(prepared.tags).toEqual(["nextjs", "css"]);
    expect(prepared.relatedProjectIds).toEqual(["aperture"]);
  });

  it("대표 이미지를 지우면 대체 텍스트도 지운다", () => {
    const prepared = prepareArticleInput({
      ...articleToInput(article()),
      cover: null,
      coverAlt: { ko: "남은 설명", en: "Leftover" },
    });

    expect(prepared.coverAlt).toBeNull();
  });

  it("대표 이미지가 있으면 대체 텍스트를 유지한다", () => {
    const coverAlt = { ko: "압축 결과 비교", en: "Compression comparison" };
    const prepared = prepareArticleInput({ ...articleToInput(article()), cover: COVER, coverAlt });

    expect(prepared.coverAlt).toEqual(coverAlt);
  });
});
