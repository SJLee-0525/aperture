import { describe, expect, it } from "vitest";

import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

const STORAGE_IMAGE =
  "https://mock-storage.aperture.invalid/v0/b/demo.appspot.com/o/dev-blog%2Fa%2Fb.webp?alt=media";

const codes = (markdown: string) => parseArticleMarkdown(markdown).issues.map(({ code }) => code);

/**
 * `MAX_NESTING_DEPTH`(32)의 두 배 — 상한을 한 번 올려도 이 값이면 여전히 넘는다.
 *
 * 더 키우지 않는 이유는 파싱 비용이다. 목록은 한 단계마다 들여쓰기가 길어져
 * micromark 가 줄마다 열린 컨테이너를 전부 다시 확인한다. 200단계로 잡았더니
 * 커버리지를 켠 CI 에서 이 한 건이 vitest 기본 타임아웃(5초)을 넘겼다.
 *
 * 아래 테스트들이 문서를 한 번만 파싱하는 것도 같은 이유다. 던지면 그 자리에서
 * 그대로 실패하므로 `not.toThrow()` 를 따로 부를 필요가 없다.
 */
const OVER_LIMIT = 64;

describe("normalizeArticleTree — 중첩 깊이", () => {
  it("깊은 인용은 RangeError 대신 issue 를 돌려준다", () => {
    expect(codes(`${">".repeat(OVER_LIMIT)} 본문`)).toContain("nesting-too-deep");
  });

  it("깊은 목록도 같은 경로로 막는다", () => {
    const markdown = Array.from(
      { length: OVER_LIMIT },
      (_, index) => `${" ".repeat(index * 2)}- 항목`,
    ).join("\n");

    expect(codes(markdown)).toContain("nesting-too-deep");
  });

  it("인라인 서식이 깊게 겹쳐도 막는다", () => {
    // toInlines 경로 — 강조가 자기 자신을 감싸며 내려간다.
    const markdown = `${"*".repeat(OVER_LIMIT * 2)}글${"*".repeat(OVER_LIMIT * 2)}`;

    expect(codes(markdown)).toContain("nesting-too-deep");
  });

  it("제목 안의 중첩도 막는다", () => {
    // toPlainText 경로 — heading 라벨은 인라인 트리를 따로 훑으므로 상한이 따로 걸려야 한다.
    const markdown = `## ${"*".repeat(OVER_LIMIT * 2)}제목${"*".repeat(OVER_LIMIT * 2)}`;

    expect(codes(markdown)).toContain("nesting-too-deep");
  });

  it("깊이 초과는 문서마다 한 번만 보고한다", () => {
    const quote = `${">".repeat(OVER_LIMIT)} 본문`;
    const markdown = [quote, "", "사이 문단", "", quote].join("\n");

    const reported = codes(markdown).filter((code) => code === "nesting-too-deep");
    expect(reported).toHaveLength(1);
  });

  it("사람이 쓰는 정도의 중첩은 그대로 통과한다", () => {
    const markdown = ["> 인용", "> ", "> - 항목", ">   - 더 안쪽", ">     - 그 안쪽"].join("\n");

    expect(codes(markdown)).toEqual([]);
  });
});

describe("normalizeArticleTree — 참조 문법", () => {
  it("참조 링크는 주소만 벗기고 글자는 남긴다", () => {
    const { document, issues } = parseArticleMarkdown(
      ["[문서][doc] 뒤 문장", "", "[doc]: https://example.com"].join("\n"),
    );

    expect(document.blocks).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "문서" },
          { type: "text", value: " 뒤 문장" },
        ],
      },
    ]);
    expect(issues.every(({ code }) => code === "reference-not-supported")).toBe(true);
  });

  it("참조 이미지는 라벨을 문장에 섞지 않고 버린다", () => {
    const { document } = parseArticleMarkdown(
      ["앞 ![대체 텍스트][img] 뒤", "", "[img]: https://example.com/a.png"].join("\n"),
    );

    expect(document.blocks).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "앞 " },
          { type: "text", value: " 뒤" },
        ],
      },
    ]);
  });

  it("정의 줄도 사유를 남긴다", () => {
    expect(codes("[doc]: https://example.com")).toEqual(["reference-not-supported"]);
  });
});

describe("normalizeArticleTree — 캡션", () => {
  it("앞에 이미지가 없으면 caption-without-image 를 남긴다", () => {
    expect(codes("::caption[설명]")).toEqual(["caption-without-image"]);
  });

  it("이미 캡션이 붙은 이미지에는 caption-duplicated 를 남긴다", () => {
    const markdown = [
      `![대체 텍스트](${STORAGE_IMAGE})`,
      "",
      "::caption[첫 설명]",
      "",
      "::caption[둘째 설명]",
    ].join("\n");

    expect(codes(markdown)).toEqual(["caption-duplicated"]);
  });

  it("먼저 붙인 캡션은 그대로 남는다", () => {
    const markdown = [
      `![대체 텍스트](${STORAGE_IMAGE})`,
      "",
      "::caption[첫 설명]",
      "",
      "::caption[둘째 설명]",
    ].join("\n");

    const [image] = parseArticleMarkdown(markdown).document.blocks;
    expect(image).toMatchObject({ type: "image", caption: "첫 설명" });
  });
});

describe("normalizeArticleTree — 코드 fence 언어", () => {
  it("Object.prototype 의 이름을 언어로 인정하지 않는다", () => {
    for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__"]) {
      const [block] = parseArticleMarkdown(["```" + name, "code", "```"].join("\n")).document
        .blocks;

      expect(block).toMatchObject({ type: "code", language: null, rawLanguage: name });
    }
  });
});
