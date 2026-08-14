import { describe, expect, it } from "vitest";

import { analyzeArticle } from "@/features/dev-blog/_lib/article-analysis";

import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

import type { DevArticle } from "@/types/dev-article";

const articleWith = (body: string): DevArticle => ({ ...MOCK_DEV_ARTICLES[0], body });

describe("analyzeArticle", () => {
  it("h2·h3 만 목차로 모은다", () => {
    const { headings } = analyzeArticle(
      articleWith(["## 절", "", "### 항", "", "#### 세부", "", "본문"].join("\n")),
    );

    expect(headings).toEqual(["절", "항"]);
  });

  it("코드 블록과 이미지 대체 텍스트는 목차에 넣지 않는다", () => {
    const { headings } = analyzeArticle(
      articleWith(
        [
          "## 절",
          "",
          "```ts",
          "const heading = 1;",
          "```",
          "",
          "![다이어그램](https://firebasestorage.googleapis.com/a.webp)",
        ].join("\n"),
      ),
    );

    expect(headings).toEqual(["절"]);
  });

  it("읽기 시간은 1분 이상이고 같은 입력에 같은 값을 낸다", () => {
    const article = articleWith("짧은 본문");

    expect(analyzeArticle(article).readingMinutes).toBeGreaterThanOrEqual(1);
    expect(analyzeArticle(article).readingMinutes).toBe(analyzeArticle(article).readingMinutes);
  });

  it("렌더 트리를 함께 돌려준다", () => {
    expect(analyzeArticle(articleWith("## 절")).document.blocks).toEqual([
      {
        type: "heading",
        depth: 2,
        id: "절",
        text: "절",
        children: [{ type: "text", value: "절" }],
      },
    ]);
  });
});
