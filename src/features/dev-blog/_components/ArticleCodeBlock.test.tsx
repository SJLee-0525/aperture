// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ArticleCodeBlock } from "@/features/dev-blog/_components/ArticleCodeBlock";

/** 비동기 Server Component 라 함수로 호출해 element 를 받은 뒤 그린다. */
const renderCodeBlock = async (props: Parameters<typeof ArticleCodeBlock>[0]) =>
  render(await ArticleCodeBlock(props));

describe("ArticleCodeBlock", () => {
  afterEach(cleanup);

  it("아는 언어는 토큰마다 라이트·다크 변수를 심는다", async () => {
    const { container } = await renderCodeBlock({
      language: "typescript",
      rawLanguage: "ts",
      value: "const a = 1;",
    });

    const [token] = Array.from(container.querySelectorAll("code span[style]"));
    expect(token.getAttribute("style")).toContain("--shiki-light");
    expect(token.getAttribute("style")).toContain("--shiki-dark");
    expect(container.querySelector("pre")?.textContent).toBe("const a = 1;");
  });

  it("여러 줄의 줄바꿈을 유지한다", async () => {
    const value = ["def a():", "    return 1", "", "print(a())"].join("\n");
    const { container } = await renderCodeBlock({ language: "python", rawLanguage: "py", value });

    expect(container.querySelector("pre")?.textContent).toBe(value);
  });

  it("모르는 언어는 색 없이 원문 그대로 보여 준다", async () => {
    const { container } = await renderCodeBlock({
      language: null,
      rawLanguage: "brainfuck",
      value: "+++",
    });

    expect(container.querySelectorAll("code span")).toHaveLength(0);
    expect(container.querySelector("pre")?.textContent).toBe("+++");
  });

  it("원문에 적힌 언어 표기를 라벨로 남긴다", async () => {
    const { container } = await renderCodeBlock({
      language: "javascript",
      rawLanguage: "js",
      value: "const a = 1;",
    });

    expect(container.querySelector("pre")?.dataset.language).toBe("js");
  });

  it("언어를 적지 않은 블록에는 라벨을 붙이지 않는다", async () => {
    const { container } = await renderCodeBlock({
      language: null,
      rawLanguage: "",
      value: "npm run build",
    });

    expect(container.querySelector("pre")?.dataset.language).toBeUndefined();
  });
});
