import { describe, expect, it } from "vitest";

import {
  articleBlockText,
  articlePlainTextClipped,
} from "@/features/dev-blog/_lib/article-plain-text";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import type { ArticlePlainTextOptions } from "@/features/dev-blog/_lib/article-plain-text";
import type { DevArticle } from "@/types/dev-article";

const textOf = (markdown: string, options: ArticlePlainTextOptions = {}): string =>
  parseArticleMarkdown(markdown)
    .document.blocks.map((block) => articleBlockText(block, options))
    .filter(Boolean)
    .join(" | ");

describe("articleBlockText", () => {
  it("중첩 목록의 텍스트를 모두 남긴다", () => {
    expect(textOf(["- 바깥", "  - 안쪽", "- 둘째"].join("\n"))).toContain("안쪽");
  });

  it("인용문 안의 문단을 남긴다", () => {
    expect(textOf("> 인용한 문장")).toBe("인용한 문장");
  });

  it("표의 머리글과 각 행을 셀 순서대로 남긴다", () => {
    const text = textOf(["| 항목 | 값 |", "| --- | --- |", "| 읽기 | 5만 |"].join("\n"));

    expect(text).toBe(["항목 · 값", "읽기 · 5만"].join("\n"));
  });

  it("링크는 주소를 버리고 라벨만 남긴다", () => {
    expect(textOf("[문서](https://example.com/docs)를 본다")).toBe("문서를 본다");
  });

  it("강조와 인라인 코드의 값을 남긴다", () => {
    expect(textOf("**굵게** 와 `code` 를 섞는다")).toBe("굵게 와 code 를 섞는다");
  });

  it("옵션이 없으면 코드 블록을 자르지 않는다", () => {
    const long = "x".repeat(500);
    const text = textOf(["```ts", long, "```"].join("\n"));

    expect(text.startsWith("code(ts): ")).toBe(true);
    expect(text).toHaveLength("code(ts): ".length + 500);
  });

  it("codeMaxChars 를 주면 그 길이에서 자른다", () => {
    const long = "x".repeat(500);
    const text = textOf(["```ts", long, "```"].join("\n"), { codeMaxChars: 400 });

    expect(text).toHaveLength("code(ts): ".length + 400);
  });

  it("목록 항목 안의 코드 블록에도 옵션이 적용된다", () => {
    // 재귀 경로가 옵션을 넘기지 않으면 중첩 코드만 무제한으로 남는다.
    const markdown = ["- 항목", "", "  ```ts", "  " + "y".repeat(500), "  ```"].join("\n");

    expect(textOf(markdown, { codeMaxChars: 100 })).toContain("y".repeat(100));
    expect(textOf(markdown, { codeMaxChars: 100 })).not.toContain("y".repeat(101));
    expect(textOf(markdown)).toContain("y".repeat(500));
  });

  it("인용문 안의 코드 블록에도 옵션이 적용된다", () => {
    const markdown = ["> 인용", ">", "> ```", "> " + "z".repeat(300), "> ```"].join("\n");

    expect(textOf(markdown, { codeMaxChars: 50 })).toContain("z".repeat(50));
    expect(textOf(markdown, { codeMaxChars: 50 })).not.toContain("z".repeat(51));
  });

  it("언어가 없는 코드 블록도 값을 남긴다", () => {
    expect(textOf(["```", "plain", "```"].join("\n"))).toBe("code: plain");
  });

  it("이미지는 대체 텍스트와 캡션만 남기고 주소는 버린다", () => {
    const text = textOf(
      [
        "![구조 다이어그램](https://mock-storage.aperture.invalid/a.webp)",
        "",
        "::caption[읽는 순서]",
      ].join("\n"),
    );

    expect(text).toBe("구조 다이어그램 읽는 순서");
  });

  it("YouTube 는 제목만 남기고 영상 ID 와 출처는 버린다", () => {
    const text = textOf(
      '::youtube[https://www.youtube.com/watch?v=kX3nB7dQ2Ls]{title="연주 영상" source="KBS"}',
    );

    expect(text).toBe("연주 영상");
  });

  it("구분선은 빈 문자열이라 구분자가 겹치지 않는다", () => {
    expect(textOf(["첫 문단", "", "---", "", "둘째 문단"].join("\n"))).toBe("첫 문단 | 둘째 문단");
  });
});

describe("articlePlainTextClipped", () => {
  const articleOf = (body: string): DevArticle => ({
    id: "a1",
    slug: "clip-test",
    title: { ko: "제목", en: "Title" },
    summary: { ko: "요약", en: "Summary" },
    body,
    cover: null,
    coverAlt: null,
    tags: [],
    relatedProjectIds: [],
    pinned: false,
    published: true,
    publishedAt: new Date("2026-08-01T00:00:00.000Z"),
    firstPublishedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });

  it("예산 안에 들어가면 전문을 그대로 돌려준다", () => {
    const result = articlePlainTextClipped(articleOf("첫 문단\n\n둘째 문단"), 1_000);

    expect(result).toEqual({ text: "첫 문단\n둘째 문단", complete: true });
  });

  it("예산을 넘으면 블록 경계까지만 담는다", () => {
    const paragraph = "가".repeat(100);
    const result = articlePlainTextClipped(
      articleOf([paragraph, paragraph, paragraph].join("\n\n")),
      250,
    );

    // 문단 두 개 + 구분자 = 201자. 세 번째를 넣으면 302자라 통째로 뺀다.
    expect(result.text).toBe(`${paragraph}\n${paragraph}`);
    expect(result.complete).toBe(false);
  });

  it("첫 블록부터 예산을 넘으면 그 블록을 예산 길이로 자른다", () => {
    const result = articlePlainTextClipped(articleOf("가".repeat(500)), 100);

    expect(result.text).toHaveLength(100);
    expect(result.complete).toBe(false);
  });

  it("본문이 비면 전문으로 본다", () => {
    expect(articlePlainTextClipped(articleOf(""), 100)).toEqual({ text: "", complete: true });
  });
});
