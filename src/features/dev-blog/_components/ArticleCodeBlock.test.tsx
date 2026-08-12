// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ArticleCodeBlock } from "@/features/dev-blog/_components/ArticleCodeBlock";
import { highlightArticleCode } from "@/features/dev-blog/_lib/markdown-highlight";

describe("ArticleCodeBlock", () => {
  afterEach(cleanup);

  it("색칠 결과를 받으면 토큰마다 라이트·다크 변수를 심는다", async () => {
    const value = "const a = 1;";
    const { container } = render(
      <ArticleCodeBlock
        rawLanguage="ts"
        value={value}
        tokens={await highlightArticleCode(value, "typescript")}
      />,
    );

    const [token] = Array.from(container.querySelectorAll("code span[style]"));
    expect(token.getAttribute("style")).toContain("--shiki-light");
    expect(token.getAttribute("style")).toContain("--shiki-dark");
    expect(container.querySelector("pre")?.textContent).toBe(value);
  });

  it("여러 줄의 줄바꿈을 유지한다", async () => {
    const value = ["def a():", "    return 1", "", "print(a())"].join("\n");
    const { container } = render(
      <ArticleCodeBlock
        rawLanguage="py"
        value={value}
        tokens={await highlightArticleCode(value, "python")}
      />,
    );

    expect(container.querySelector("pre")?.textContent).toBe(value);
  });

  it("색칠 결과가 없으면 원문 그대로 보여 준다", () => {
    const { container } = render(
      <ArticleCodeBlock rawLanguage="brainfuck" value="+++" tokens={null} />,
    );

    expect(container.querySelectorAll("code span")).toHaveLength(0);
    expect(container.querySelector("pre")?.textContent).toBe("+++");
  });

  it("원문에 적힌 언어 표기를 라벨로 남긴다", () => {
    const { container } = render(
      <ArticleCodeBlock rawLanguage="js" value="const a = 1;" tokens={null} />,
    );

    expect(container.querySelector("pre")?.dataset.language).toBe("js");
  });

  it("언어를 적지 않은 블록에는 라벨을 붙이지 않는다", () => {
    const { container } = render(
      <ArticleCodeBlock rawLanguage="" value="npm run build" tokens={null} />,
    );

    expect(container.querySelector("pre")?.dataset.language).toBeUndefined();
  });
});
