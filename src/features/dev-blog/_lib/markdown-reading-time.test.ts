import { describe, expect, it } from "vitest";

import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";
import { articleReadingMinutes } from "@/features/dev-blog/_lib/markdown-reading-time";

const minutesOf = (markdown: string) =>
  articleReadingMinutes(parseArticleMarkdown(markdown).document);

const repeat = (text: string, times: number) => Array.from({ length: times }, () => text).join("");

describe("articleReadingMinutes", () => {
  it("아무리 짧아도 1분으로 표시한다", () => {
    expect(minutesOf("")).toBe(1);
    expect(minutesOf("한 줄")).toBe(1);
  });

  it("한중일 글자는 500자/분으로 센다", () => {
    // 750자 = 1.5분 → 올림 2분.
    expect(minutesOf(repeat("가", 750))).toBe(2);
  });

  it("그 밖의 언어는 265단어/분으로 센다", () => {
    expect(minutesOf(Array.from({ length: 400 }, () => "word").join(" "))).toBe(2);
  });

  it("코드는 비어 있지 않은 줄만 20줄/분으로 더한다", () => {
    const code = ["```javascript", ...Array.from({ length: 50 }, () => "const a = 1;"), "```"];
    const withBlankLines = ["```javascript", ...Array.from({ length: 50 }, () => ""), "```"];

    expect(minutesOf(code.join("\n"))).toBe(3);
    expect(minutesOf(withBlankLines.join("\n"))).toBe(1);
  });

  it("목록·인용문·표 안의 글자도 함께 센다", () => {
    const nested = ["- " + repeat("가", 300), "", "> " + repeat("나", 300)].join("\n");

    expect(minutesOf(nested)).toBe(2);
  });

  it("이미지 대체 텍스트·캡션·영상 제목은 세지 않는다", () => {
    const media = [
      `![${repeat("가", 600)}](https://storage.googleapis.com/demo/a.webp)`,
      `::caption[${repeat("나", 600)}]`,
      "",
      `::youtube[https://youtu.be/kX3nB7dQ2Ls]{title="${repeat("다", 600)}"}`,
    ].join("\n");

    expect(minutesOf(media)).toBe(1);
  });

  it("강제 줄바꿈으로 나뉜 단어를 하나로 붙이지 않는다", () => {
    // 줄바꿈을 공백으로 바꾸지 않으면 400 단어가 한 단어로 뭉쳐 1분이 된다.
    expect(minutesOf(Array.from({ length: 400 }, () => "word").join("  \n"))).toBe(2);
  });

  it("구두점만 있는 조각은 단어로 세지 않는다", () => {
    expect(minutesOf(Array.from({ length: 400 }, () => "—").join(" "))).toBe(1);
  });
});
