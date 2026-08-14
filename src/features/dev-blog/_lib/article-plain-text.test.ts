import { describe, expect, it } from "vitest";

import { articleBlockText } from "@/features/dev-blog/_lib/article-plain-text";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

const textOf = (markdown: string): string =>
  parseArticleMarkdown(markdown).document.blocks.map(articleBlockText).filter(Boolean).join(" | ");

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

  it("코드 블록은 언어를 붙이고 400자까지만 남긴다", () => {
    const long = "x".repeat(500);
    const text = textOf(["```ts", long, "```"].join("\n"));

    expect(text.startsWith("code(ts): ")).toBe(true);
    expect(text).toHaveLength("code(ts): ".length + 400);
  });

  it("언어가 없는 코드 블록도 값을 남긴다", () => {
    expect(textOf(["```", "plain", "```"].join("\n"))).toBe("code: plain");
  });

  it("이미지는 대체 텍스트와 캡션만 남기고 주소는 버린다", () => {
    const text = textOf(
      [
        "![구조 다이어그램](https://firebasestorage.googleapis.com/a.webp)",
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
