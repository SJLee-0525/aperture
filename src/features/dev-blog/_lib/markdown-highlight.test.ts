import { describe, expect, it } from "vitest";

import {
  highlightArticleCode,
  highlightArticleDocument,
} from "@/features/dev-blog/_lib/markdown-highlight";
import { articleCodeHighlightKey } from "@/features/dev-blog/_lib/markdown-highlight-map";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import type { ArticleCodeLanguage } from "@/features/dev-blog/_lib/markdown-code-language";

/** 문법 로더는 언어마다 한 줄씩 손으로 적어 둔다 — 주소를 잘못 적으면 그 언어에서만 색이 사라진다. */
const ALL_LANGUAGES: ArticleCodeLanguage[] = [
  "javascript",
  "jsx",
  "typescript",
  "tsx",
  "java",
  "c",
  "cpp",
  "python",
  "bash",
  "json",
  "css",
  "sql",
];

const flatten = (lines: NonNullable<Awaited<ReturnType<typeof highlightArticleCode>>>) =>
  lines.map((line) => line.map((token) => token.content).join("")).join("\n");

describe("highlightArticleCode", () => {
  it("줄 수를 유지하고 원문을 그대로 복원할 수 있다", async () => {
    const code = ["const a = 1;", "", "console.log(a);"].join("\n");
    const highlighted = await highlightArticleCode(code, "javascript");

    expect(highlighted).not.toBeNull();
    expect(highlighted).toHaveLength(3);
    expect(flatten(highlighted!)).toBe(code);
  });

  it("라이트·다크 색을 CSS 변수 한 쌍으로 준다", async () => {
    const [firstLine] = (await highlightArticleCode("const a = 1;", "typescript")) ?? [];
    const [firstToken] = firstLine ?? [];

    expect(Object.keys(firstToken.style)).toEqual(["--shiki-light", "--shiki-dark"]);
    expect(firstToken.style["--shiki-light"]).not.toBe(firstToken.style["--shiki-dark"]);
    // 기본 색을 인라인으로 박으면 테마 전환이 CSS 변수만으로 끝나지 않는다.
    expect(firstToken.style).not.toHaveProperty("color");
  });

  it("문법마다 다른 토큰 경계를 만든다", async () => {
    const code = "int main(void) { return 0; }";
    const [c] = (await highlightArticleCode(code, "c")) ?? [];
    const [python] = (await highlightArticleCode(code, "python")) ?? [];

    expect(c.map((token) => token.content)).not.toEqual(python.map((token) => token.content));
  });

  it("지원한다고 적어 둔 모든 언어의 문법을 실제로 읽어 온다", async () => {
    const results = await Promise.all(
      ALL_LANGUAGES.map(async (language) => [language, await highlightArticleCode("a", language)]),
    );

    results.forEach(([language, highlighted]) => {
      expect(highlighted, language as string).not.toBeNull();
    });
  });

  it("같은 언어를 다시 요청해도 같은 결과를 낸다", async () => {
    const first = await highlightArticleCode("print('a')", "python");
    const second = await highlightArticleCode("print('a')", "python");

    expect(second).toEqual(first);
  });
});

const body = (...rows: string[]) => rows.join("\n");

describe("highlightArticleDocument", () => {
  it("목록·인용 안에 들어간 코드까지 모은다", async () => {
    const { document } = parseArticleMarkdown(
      body(
        "- 목록 안",
        "",
        "  ```ts",
        "  const inList = 1;",
        "  ```",
        "",
        "> 인용 안",
        ">",
        "> ```python",
        "> in_quote = 1",
        "> ```",
      ),
    );

    const highlights = await highlightArticleDocument(document);

    expect(Object.keys(highlights)).toEqual(
      expect.arrayContaining([
        articleCodeHighlightKey("typescript", "const inList = 1;"),
        articleCodeHighlightKey("python", "in_quote = 1"),
      ]),
    );
  });

  it("같은 코드가 두 번 나오면 키 하나로 합친다", async () => {
    const fence = ["```js", "const a = 1;", "```"];
    const { document } = parseArticleMarkdown(body(...fence, "", ...fence));

    const highlights = await highlightArticleDocument(document);

    expect(Object.keys(highlights)).toEqual([
      articleCodeHighlightKey("javascript", "const a = 1;"),
    ]);
  });

  it("모르는 언어는 색칠 대상에서 빼 렌더러가 원문을 그대로 그리게 한다", async () => {
    const { document } = parseArticleMarkdown(body("```brainfuck", "+++", "```"));

    await expect(highlightArticleDocument(document)).resolves.toEqual({});
  });

  it("코드가 없는 글은 빈 결과를 낸다", async () => {
    const { document } = parseArticleMarkdown("## 제목\n\n본문 한 줄.");

    await expect(highlightArticleDocument(document)).resolves.toEqual({});
  });
});
