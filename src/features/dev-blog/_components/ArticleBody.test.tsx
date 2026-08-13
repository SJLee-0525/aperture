// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ArticleBody } from "@/features/dev-blog/_components/ArticleBody";

import { highlightArticleDocument } from "@/features/dev-blog/_lib/markdown-highlight";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";
import { buildArticleToc } from "@/features/dev-blog/_lib/markdown-toc";

import type { ArticleCodeHighlights } from "@/features/dev-blog/_lib/markdown-highlight-map";

const STORAGE_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/dev-blog%2Fa%2Fb.webp?alt=media";

const renderMarkdown = (
  markdown: string,
  lang: "ko" | "en" = "ko",
  highlights: ArticleCodeHighlights = {},
) => {
  const { document } = parseArticleMarkdown(markdown);
  return {
    ...render(<ArticleBody document={document} lang={lang} highlights={highlights} />),
    document,
  };
};

describe("ArticleBody", () => {
  afterEach(cleanup);

  it("본문 컨테이너에 한국어 원문임을 표시한다", () => {
    const { container } = renderMarkdown("본문", "en");

    expect(container.querySelector("[lang='ko']")).not.toBeNull();
  });

  it("heading id 가 목차와 같은 값을 쓴다", () => {
    const { document } = renderMarkdown(["## 정리", "", "### 안쪽", "", "## 정리"].join("\n"));
    const rendered = Array.from(screen.getAllByRole("heading")).map((node) => node.id);

    expect(rendered).toEqual(["정리", "안쪽", "정리-2"]);
    expect(buildArticleToc(document).map((item) => item.id)).toEqual(["정리", "정리-2"]);
  });

  it("이미지와 캡션을 figure 로 묶는다", () => {
    const { container } = renderMarkdown(
      [`![압축 결과 비교](${STORAGE_IMAGE})`, "::caption[3단 WebP]"].join("\n"),
    );

    const image = screen.getByAltText("압축 결과 비교");
    expect(image.getAttribute("src")).toBe(STORAGE_IMAGE);
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(container.querySelector("figcaption")?.textContent).toBe("3단 WebP");
  });

  it("외부 링크에만 새 탭과 rel 을 붙이고 내부 링크에는 언어 프리픽스를 붙인다", () => {
    renderMarkdown("[문서](https://nextjs.org/docs) [목록](/dev/projects)", "en");

    const external = screen.getByRole("link", { name: "문서" });
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toBe("noreferrer noopener");

    const internal = screen.getByRole("link", { name: "목록" });
    expect(internal.getAttribute("href")).toBe("/en/dev/projects");
    expect(internal.getAttribute("target")).toBeNull();
  });

  it("메일 링크는 새 탭으로 열지 않는다", () => {
    renderMarkdown("[메일](mailto:hello@example.com)");

    const mail = screen.getByRole("link", { name: "메일" });
    expect(mail.getAttribute("href")).toBe("mailto:hello@example.com");
    expect(mail.getAttribute("target")).toBeNull();
  });

  it("YouTube 지시자를 재생 전 facade 로 그린다", () => {
    renderMarkdown('::youtube[https://youtu.be/kX3nB7dQ2Ls]{title="배포 흐름 데모"}');

    expect(screen.getByRole("button", { name: "배포 흐름 데모" })).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("표의 열 정렬을 원문대로 옮긴다", () => {
    renderMarkdown(["| 항목 | 비용 |", "| --- | ---: |", "| 호스팅 | $0 |"].join("\n"));

    const [, cost] = screen.getAllByRole("columnheader");
    expect(cost.style.textAlign).toBe("right");
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["호스팅", "$0"]);
  });

  it("색칠 결과에서 해당 코드 블록의 토큰을 찾아 그린다", async () => {
    const markdown = ["```ts", "const a = 1;", "```", "", "```brainfuck", "+++", "```"].join("\n");
    const { document } = parseArticleMarkdown(markdown);
    const { container } = renderMarkdown(markdown, "ko", await highlightArticleDocument(document));

    const [typescript, unknown] = Array.from(container.querySelectorAll("pre"));
    expect(typescript.querySelectorAll("code span[style]").length).toBeGreaterThan(0);
    expect(typescript.textContent).toBe("const a = 1;");
    // 색칠 대상이 아닌 블록은 map 에 키가 없어 원문만 남는다.
    expect(unknown.querySelectorAll("code span")).toHaveLength(0);
    expect(unknown.textContent).toBe("+++");
  });

  it("허용하지 않은 요소는 화면에 남기지 않는다", () => {
    const { container } = renderMarkdown(
      ['<img src="x" onerror="steal()">', "", "[클릭](javascript:alert(1))"].join("\n"),
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("클릭");
  });
});
