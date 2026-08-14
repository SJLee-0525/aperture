import { describe, expect, it } from "vitest";

import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";
import { buildArticleToc } from "@/features/dev-blog/_lib/markdown-toc";

const tocOf = (markdown: string) => buildArticleToc(parseArticleMarkdown(markdown).document);

describe("buildArticleToc", () => {
  it("h3 를 바로 앞 h2 아래에 넣는다", () => {
    expect(
      tocOf(["## 비용", "", "### 호스팅", "", "### 저장소", "", "## 정리"].join("\n")),
    ).toEqual([
      {
        id: "비용",
        text: "비용",
        children: [
          { id: "호스팅", text: "호스팅" },
          { id: "저장소", text: "저장소" },
        ],
      },
      { id: "정리", text: "정리", children: [] },
    ]);
  });

  it("h4 는 목차에 넣지 않는다", () => {
    expect(tocOf(["## 겉", "", "#### 너무 깊음"].join("\n"))).toEqual([
      { id: "겉", text: "겉", children: [] },
    ]);
  });

  it("h2 보다 먼저 나온 h3 는 최상위에 둔다", () => {
    expect(tocOf(["### 먼저", "", "## 나중"].join("\n"))).toEqual([
      { id: "먼저", text: "먼저", children: [] },
      { id: "나중", text: "나중", children: [] },
    ]);
  });

  it("앞선 h2 가 없는 h3 끼리는 서로를 품지 않는다", () => {
    // `items.at(-1)` 을 부모로 삼으면 `나중` 이 `먼저` 의 자식이 되어, 원문에 없는 계층이 생긴다.
    expect(tocOf(["### 먼저", "", "### 나중", "", "## 절", "", "### 안쪽"].join("\n"))).toEqual([
      { id: "먼저", text: "먼저", children: [] },
      { id: "나중", text: "나중", children: [] },
      { id: "절", text: "절", children: [{ id: "안쪽", text: "안쪽" }] },
    ]);
  });

  it("본문 heading id 와 같은 값을 쓴다", () => {
    const { document } = parseArticleMarkdown(["## 정리", "", "## 정리"].join("\n"));
    const ids = document.blocks.flatMap((block) => (block.type === "heading" ? [block.id] : []));

    expect(buildArticleToc(document).map((item) => item.id)).toEqual(ids);
  });

  it("heading 이 없으면 빈 목차다", () => {
    expect(tocOf("본문만 있다")).toEqual([]);
  });
});
