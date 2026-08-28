// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ArticleBody } from "@/features/dev-blog/_components/ArticleBody";

import { highlightArticleDocument } from "@/features/dev-blog/_lib/markdown-highlight";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";
import { buildArticleToc } from "@/features/dev-blog/_lib/markdown-toc";

import type { ArticleCodeHighlights } from "@/features/dev-blog/_lib/markdown-highlight-map";

const STORAGE_IMAGE =
  "https://mock-storage.aperture.invalid/v0/b/demo.appspot.com/o/dev-blog%2Fa%2Fb.webp?alt=media";

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

  it("크기를 아는 이미지는 도착 전에 자리를 잡을 수 있게 속성으로 크기를 넘긴다", () => {
    renderMarkdown(`![구조도](${STORAGE_IMAGE} "2048x1365")`);

    const image = screen.getByAltText("구조도");
    expect(image.getAttribute("width")).toBe("2048");
    expect(image.getAttribute("height")).toBe("1365");
    // CSS 임시 비율이 붙으면 속성으로 잡은 실제 비율을 덮는다.
    expect(image.className).toBe("");
  });

  it("크기를 모르는 이미지에는 임시 비율 class 를 붙인다", () => {
    renderMarkdown(`![구조도](${STORAGE_IMAGE})`);

    const image = screen.getByAltText("구조도");
    expect(image.getAttribute("width")).toBeNull();
    expect(image.className).not.toBe("");
  });

  it("크기를 모르는 이미지도 실려 오면 임시 비율을 걷는다", () => {
    renderMarkdown(`![구조도](${STORAGE_IMAGE})`);
    const image = screen.getByAltText("구조도") as HTMLImageElement;

    Object.defineProperty(image, "naturalWidth", { value: 800, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: 600, configurable: true });
    fireEvent.load(image);

    expect(screen.getByAltText("구조도").className).toBe("");
  });

  it("캐시로 이미 실려 온 이미지는 load 이벤트 없이도 임시 비율을 걷는다", () => {
    // 마운트 시점에 이미 complete 인 이미지는 React onLoad 가 잡히지 않는다.
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", {
      configurable: true,
      get: () => 600,
    });

    try {
      renderMarkdown(`![구조도](${STORAGE_IMAGE})`);

      expect(screen.getByAltText("구조도").className).toBe("");
    } finally {
      // prototype 을 되돌리지 않으면 뒤따르는 테스트의 이미지도 실려 온 것으로 보인다.
      for (const key of ["complete", "naturalWidth", "naturalHeight"]) {
        Reflect.deleteProperty(HTMLImageElement.prototype, key);
      }
    }
  });

  it("hydration 전에 실패한 이미지는 error 이벤트 없이도 자리 그림으로 바꾼다", () => {
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => 0,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", {
      configurable: true,
      get: () => 0,
    });

    try {
      const { container } = renderMarkdown(`![구조도](${STORAGE_IMAGE})`);

      expect(screen.queryByAltText("구조도")).toBeNull();
      expect(container.querySelector("figure img")).toBeNull();
    } finally {
      for (const key of ["complete", "naturalWidth", "naturalHeight"]) {
        Reflect.deleteProperty(HTMLImageElement.prototype, key);
      }
    }
  });

  it("원문에 크기를 적은 이미지는 실려 오기 전에도 확대 뷰가 그 비율을 쓴다", async () => {
    renderMarkdown(`![구조도](${STORAGE_IMAGE} "2048x1365")`);

    fireEvent.click(screen.getByRole("button", { name: /구조도/ }));

    // 확대 뷰는 dynamic import 라 기본 1초 제한으로는 부하가 걸린 실행에서 흔들린다.
    const stage = await waitFor(
      () => {
        const node = window.document.querySelector<HTMLElement>("[style*='aspect-ratio']");
        expect(node).not.toBeNull();
        return node as HTMLElement;
      },
      { timeout: 5_000 },
    );
    expect(stage.style.aspectRatio).toBe("2048 / 1365");
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
