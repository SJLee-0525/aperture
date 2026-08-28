import { describe, expect, it } from "vitest";

import { toArticleSearchSources } from "@/features/dev-blog/_lib/article-search-source";

import { MOCK_DEV_ARTICLE_TAGS } from "@/mocks/dev-article-tags";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

import type { DevArticle } from "@/types/dev-article";

const articleWith = (overrides: Partial<DevArticle>): DevArticle => ({
  ...MOCK_DEV_ARTICLES[0],
  ...overrides,
});

describe("toArticleSearchSources", () => {
  it("태그마다 id·한국어·영어 라벨을 모두 담고 중복을 지운다", () => {
    const [source] = toArticleSearchSources(
      [articleWith({ tags: ["css", "typescript"] })],
      MOCK_DEV_ARTICLE_TAGS,
    );

    // css 는 ko·en 라벨이 같아 세 값이 두 값으로 줄어든다.
    expect(source.tagLabels).toEqual(["css", "CSS", "typescript", "TypeScript"]);
  });

  it("행에 보여 줄 태그는 현재 언어 라벨만 담는다", () => {
    const [source] = toArticleSearchSources(
      [articleWith({ tags: ["css", "retrospective"] })],
      MOCK_DEV_ARTICLE_TAGS,
    );

    expect(source.tagText).toEqual({ ko: "CSS · 회고", en: "CSS · Retrospective" });
  });

  it("태그가 없으면 표시용 문자열도 비어 있다", () => {
    const [source] = toArticleSearchSources([articleWith({ tags: [] })], MOCK_DEV_ARTICLE_TAGS);

    expect(source.tagText).toEqual({ ko: "", en: "" });
  });

  it("사전에 없는 태그는 id 만 남긴다", () => {
    const [source] = toArticleSearchSources([articleWith({ tags: ["removed"] })], []);

    expect(source.tagLabels).toEqual(["removed"]);
  });

  it("본문 h2·h3 만 목차로 담는다 — h4·코드·이미지 대체 텍스트는 제외한다", () => {
    const [source] = toArticleSearchSources(
      [
        articleWith({
          body: [
            "## 절",
            "",
            "### 항",
            "",
            "#### 세부",
            "",
            "```ts",
            "const skipped = 1;",
            "```",
            "",
            "![대체 텍스트](https://mock-storage.aperture.invalid/a.webp)",
          ].join("\n"),
        }),
      ],
      MOCK_DEV_ARTICLE_TAGS,
    );

    expect(source.headings).toEqual(["절", "항"]);
  });

  it("입력 순서를 지키고 본문은 담지 않는다", () => {
    const sources = toArticleSearchSources(
      [articleWith({ id: "b" }), articleWith({ id: "a" })],
      MOCK_DEV_ARTICLE_TAGS,
    );

    expect(sources.map(({ id }) => id)).toEqual(["b", "a"]);
    expect(Object.keys(sources[0])).not.toContain("body");
  });
});
