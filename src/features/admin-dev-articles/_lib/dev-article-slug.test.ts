import { describe, expect, it } from "vitest";

import {
  ARTICLE_SLUG_MAX_LENGTH,
  isArticleSlugTaken,
  normalizeArticleSlug,
  suggestArticleSlug,
} from "@/features/admin-dev-articles/_lib/dev-article-slug";

describe("normalizeArticleSlug", () => {
  it("한글을 로마자로 바꾼다", () => {
    expect(normalizeArticleSlug("서버리스 포트폴리오")).toBe("seobeoriseu-poteupollio");
  });

  it("대문자·공백·기호를 하이픈으로 정리한다", () => {
    expect(normalizeArticleSlug("  Next.js 16 Upgrade!  ")).toBe("next-js-16-upgrade");
  });

  it("앞뒤 하이픈을 남기지 않는다", () => {
    expect(normalizeArticleSlug("---본문---")).toBe("bonmun");
  });

  it("길이 상한에서 자르고 잘린 끝의 하이픈도 지운다", () => {
    const long = normalizeArticleSlug("a".repeat(ARTICLE_SLUG_MAX_LENGTH + 20));

    expect(long).toHaveLength(ARTICLE_SLUG_MAX_LENGTH);
    expect(long.endsWith("-")).toBe(false);
  });

  it("남는 글자가 없으면 빈 문자열이다", () => {
    expect(normalizeArticleSlug("!!! ???")).toBe("");
    expect(normalizeArticleSlug("   ")).toBe("");
  });

  it("이미 정규화된 값은 그대로 둔다", () => {
    expect(normalizeArticleSlug("serverless-portfolio")).toBe("serverless-portfolio");
  });
});

describe("suggestArticleSlug", () => {
  it("영어 제목을 우선한다", () => {
    expect(suggestArticleSlug({ ko: "서버리스", en: "Serverless portfolio" })).toBe(
      "serverless-portfolio",
    );
  });

  it("영어 제목이 없으면 한국어 제목을 로마자로 바꾼다", () => {
    expect(suggestArticleSlug({ ko: "회고", en: "  " })).toBe("hoego");
  });

  it("두 제목이 모두 비어 있으면 빈 문자열이다", () => {
    expect(suggestArticleSlug({ ko: "", en: "" })).toBe("");
  });
});

describe("isArticleSlugTaken", () => {
  const articles = [
    { id: "a1", slug: "serverless-portfolio" },
    { id: "a2", slug: "css-modules" },
  ];

  it("다른 글이 쓰는 주소를 중복으로 본다", () => {
    expect(isArticleSlugTaken("css-modules", articles, "a1")).toBe(true);
  });

  it("자기 자신은 중복이 아니다", () => {
    expect(isArticleSlugTaken("css-modules", articles, "a2")).toBe(false);
  });

  it("아무도 쓰지 않으면 비어 있다", () => {
    expect(isArticleSlugTaken("new-note", articles)).toBe(false);
  });
});
