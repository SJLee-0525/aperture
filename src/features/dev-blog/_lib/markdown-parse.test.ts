import { describe, expect, it } from "vitest";

import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

const STORAGE_IMAGE =
  "https://mock-storage.aperture.invalid/v0/b/demo.appspot.com/o/dev-blog%2Fa%2Fb.webp?alt=media";

const codes = (markdown: string) => parseArticleMarkdown(markdown).issues.map(({ code }) => code);

describe("parseArticleMarkdown — 허용 목록", () => {
  it("임의 HTML 을 렌더 트리에 넣지 않고 issue 로 남긴다", () => {
    const { document, issues } = parseArticleMarkdown(
      ['<div onclick="steal()">클릭</div>', "", "본문"].join("\n"),
    );

    expect(document.blocks).toEqual([
      { type: "paragraph", children: [{ type: "text", value: "본문" }] },
    ]);
    expect(issues).toEqual([
      { code: "unsupported-node", point: { line: 1, column: 1 }, detail: "html" },
    ]);
  });

  it("허용하지 않은 링크는 주소만 벗기고 문장은 남긴다", () => {
    const { document, issues } = parseArticleMarkdown("[여기](javascript:alert(1))를 눌러라");

    expect(document.blocks).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "여기" },
          { type: "text", value: "를 눌러라" },
        ],
      },
    ]);
    expect(issues[0]).toMatchObject({ code: "link-not-allowed" });
  });

  it("허용한 인라인 서식을 그대로 옮긴다", () => {
    const { document, issues } = parseArticleMarkdown(
      "**굵게** *기울임* `코드` [문서](/dev/projects)",
    );

    expect(issues).toEqual([]);
    expect(document.blocks[0]).toMatchObject({
      type: "paragraph",
      children: [
        { type: "strong" },
        { type: "text" },
        { type: "emphasis" },
        { type: "text" },
        { type: "inlineCode", value: "코드" },
        { type: "text" },
        { type: "link", href: "/dev/projects", target: "internal" },
      ],
    });
  });
});

describe("parseArticleMarkdown — heading", () => {
  it("같은 제목에 문서 순서대로 다른 id 를 준다", () => {
    const { document } = parseArticleMarkdown(
      ["## 정리", "", "## 남은 일", "", "## 정리"].join("\n"),
    );

    expect(document.blocks.map((block) => ("id" in block ? block.id : null))).toEqual([
      "정리",
      "남은-일",
      "정리-2",
    ]);
  });

  it("허용 범위를 벗어난 깊이는 가장 가까운 깊이로 당기고 issue 를 남긴다", () => {
    const { document, issues } = parseArticleMarkdown(["# 제목", "", "##### 너무 깊음"].join("\n"));

    expect(document.blocks.map((block) => ("depth" in block ? block.depth : null))).toEqual([2, 4]);
    expect(issues.map(({ code, detail }) => [code, detail])).toEqual([
      ["heading-level", "h1"],
      ["heading-level", "h5"],
    ]);
  });
});

describe("parseArticleMarkdown — 이미지와 캡션", () => {
  it("단독 이미지 뒤의 caption 을 이미지에 붙인다", () => {
    const { document, issues } = parseArticleMarkdown(
      [`![압축 결과](${STORAGE_IMAGE})`, "::caption[2048px 메인]"].join("\n"),
    );

    expect(issues).toEqual([]);
    expect(document.blocks).toEqual([
      {
        type: "image",
        src: STORAGE_IMAGE,
        alt: "압축 결과",
        caption: "2048px 메인",
        dimensions: null,
      },
    ]);
  });

  it("앞에 이미지가 없는 caption 은 issue 다", () => {
    expect(codes("::caption[설명만 있다]")).toEqual(["caption-without-image"]);
  });

  it("허용하지 않은 출처의 이미지는 렌더하지 않는다", () => {
    const { document, issues } = parseArticleMarkdown("![외부](https://example.com/a.png)");

    expect(document.blocks).toEqual([]);
    expect(issues[0]).toMatchObject({ code: "image-source-not-allowed" });
  });

  it("대체 텍스트가 없으면 issue 를 남긴다", () => {
    expect(codes(`![](${STORAGE_IMAGE})`)).toEqual(["image-alt-missing"]);
  });

  it("문장 중간의 이미지는 배치가 깨지므로 issue 다", () => {
    expect(codes(`앞 ![설명](${STORAGE_IMAGE}) 뒤`)).toEqual(["inline-image"]);
  });

  it("title 자리의 너비x높이를 원본 크기로 읽는다", () => {
    const { issues, document } = parseArticleMarkdown(`![압축 결과](${STORAGE_IMAGE} "2048x1365")`);

    expect(issues).toEqual([]);
    expect(document.blocks[0]).toMatchObject({ dimensions: { width: 2048, height: 1365 } });
  });

  it("title 이 없으면 크기를 모르는 이미지다", () => {
    const { document } = parseArticleMarkdown(`![압축 결과](${STORAGE_IMAGE})`);

    expect(document.blocks[0]).toMatchObject({ dimensions: null });
  });

  it.each([
    ["설명용 title", "압축 결과 비교"],
    ["0 은 크기가 아니다", "0x100"],
    ["공백이 섞인 표기", "2048 x 1365"],
    ["곱셈 기호", "2048×1365"],
    ["한쪽만 있음", "2048x"],
    ["음수", "-10x20"],
    ["다른 문법", "width=2048"],
    ["상한 초과", "20000x20000"],
  ])("%s 는 크기로 읽지 않고 발행도 막지 않는다", (_label, title) => {
    const { issues, document } = parseArticleMarkdown(`![압축 결과](${STORAGE_IMAGE} "${title}")`);

    // title 은 원래 표준 Markdown 의 설명 자리다. 형식이 달라도 오류가 아니다.
    expect(issues).toEqual([]);
    expect(document.blocks[0]).toMatchObject({ dimensions: null });
  });

  it("캡션을 붙여도 크기는 남는다", () => {
    const { document } = parseArticleMarkdown(
      [`![압축 결과](${STORAGE_IMAGE} "800x600")`, "::caption[세 벌]"].join("\n"),
    );

    expect(document.blocks[0]).toMatchObject({
      caption: "세 벌",
      dimensions: { width: 800, height: 600 },
    });
  });
});

describe("parseArticleMarkdown — 전용 문법", () => {
  it("youtube 지시자를 영상 블록으로 옮긴다", () => {
    const { document, issues } = parseArticleMarkdown(
      '::youtube[https://youtu.be/kX3nB7dQ2Ls]{title="배포 흐름 데모" source="직접 녹화"}',
    );

    expect(issues).toEqual([]);
    expect(document.blocks).toEqual([
      { type: "youtube", videoId: "kX3nB7dQ2Ls", title: "배포 흐름 데모", source: "직접 녹화" },
    ]);
  });

  it("임의 지시자는 렌더하지 않는다", () => {
    const { document, issues } = parseArticleMarkdown("::script[alert(1)]");

    expect(document.blocks).toEqual([]);
    expect(issues[0]).toMatchObject({ code: "unknown-directive", detail: "script" });
  });
});

describe("parseArticleMarkdown — 블록 구조", () => {
  it("표를 머리 행과 나머지 행으로 나눈다", () => {
    const { document } = parseArticleMarkdown(
      ["| 항목 | 비용 |", "| --- | ---: |", "| 호스팅 | $0 |"].join("\n"),
    );

    expect(document.blocks[0]).toMatchObject({
      type: "table",
      align: [null, "right"],
      header: [[{ type: "text", value: "항목" }], [{ type: "text", value: "비용" }]],
      rows: [[[{ type: "text", value: "호스팅" }], [{ type: "text", value: "$0" }]]],
    });
  });

  it("중첩 목록과 인용문을 블록으로 유지한다", () => {
    const { document } = parseArticleMarkdown(
      ["- 겉", "  - 안", "", "> 인용", "", "---"].join("\n"),
    );

    expect(document.blocks.map((block) => block.type)).toEqual([
      "list",
      "blockquote",
      "thematicBreak",
    ]);
  });

  it("코드 블록의 언어 별칭을 정규화하고 모르는 언어는 색을 포기한다", () => {
    const { document } = parseArticleMarkdown(
      ["```js", "const a = 1;", "```", "", "```brainfuck", "+++", "```"].join("\n"),
    );

    expect(document.blocks).toEqual([
      { type: "code", language: "javascript", rawLanguage: "js", value: "const a = 1;" },
      { type: "code", language: null, rawLanguage: "brainfuck", value: "+++" },
    ]);
  });
});

describe("mock 본문", () => {
  it("모든 mock 글이 발행을 막는 사유 없이 파싱된다", () => {
    MOCK_DEV_ARTICLES.forEach((article) => {
      expect(parseArticleMarkdown(article.body).issues, article.id).toEqual([]);
    });
  });
});
