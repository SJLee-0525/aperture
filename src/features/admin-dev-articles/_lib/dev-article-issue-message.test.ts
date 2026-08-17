import { describe, expect, it } from "vitest";

import {
  markdownIssueMessage,
  publishIssueMessage,
} from "@/features/admin-dev-articles/_lib/dev-article-issue-message";
import { checkArticlePublishable } from "@/features/admin-dev-articles/_lib/dev-article-publish-check";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

describe("markdownIssueMessage", () => {
  it("원문 줄 번호를 앞에 붙인다", () => {
    const { issues } = parseArticleMarkdown("본문\n\n![](https://example.test/a.webp)");

    expect(issues.length).toBeGreaterThan(0);
    expect(markdownIssueMessage(issues[0])).toMatch(/^3번째 줄 — /);
  });

  it("detail 이 있으면 괄호로 덧붙인다", () => {
    expect(
      markdownIssueMessage({
        code: "unsupported-node",
        point: { line: 5, column: 1 },
        detail: "footnoteDefinition",
      }),
    ).toBe(
      "5번째 줄 — 지원하지 않는 문법입니다. 지원 범위는 Markdown 도움말을 보세요. (footnoteDefinition)",
    );
  });

  it("파서가 낼 수 있는 모든 사유에 문구가 있다", () => {
    const samples = [
      "<div>임의 HTML</div>",
      "# 너무 큰 제목",
      "문장 중간 ![설명](https://firebasestorage.googleapis.com/a.webp) 이미지",
      "![](https://firebasestorage.googleapis.com/a.webp)",
      "![설명](https://evil.test/a.webp)",
      "[링크](javascript:alert(1))",
      "::caption[앞에 이미지 없음]",
      "![설명](https://firebasestorage.googleapis.com/a.webp)\n::caption[]",
      '::youtube[https://vimeo.com/1]{title="제목"}',
      "::youtube[https://youtu.be/kX3nB7dQ2Ls]",
      "::unknown[무엇]",
    ];

    const codes = new Set(
      samples.flatMap((sample) => parseArticleMarkdown(sample).issues.map((issue) => issue.code)),
    );

    expect(codes.size).toBeGreaterThan(0);
    codes.forEach((code) => {
      const message = markdownIssueMessage({ code, point: { line: 1, column: 1 } });
      expect(message, code).not.toContain("undefined");
    });
  });
});

describe("publishIssueMessage", () => {
  it("발행 조건 사유마다 다음 행동을 알려 준다", () => {
    expect(publishIssueMessage({ code: "title-missing" })).toContain("입력하세요");
    expect(publishIssueMessage({ code: "slug-duplicated", detail: "css-modules" })).toContain(
      "(css-modules)",
    );
  });

  it("검사 함수가 내는 모든 사유에 문구가 있다", () => {
    const issues = checkArticlePublishable(
      {
        slug: "",
        title: { ko: "", en: "" },
        summary: { ko: "", en: "" },
        body: "",
        cover: { url: "https://a.test/a.webp", path: "p", w: 1, h: 1 },
        coverAlt: null,
        tags: ["없는-태그"],
        relatedProjectIds: ["없는-프로젝트"],
        published: true,
        publishedAt: null,
        firstPublishedAt: null,
      },
      {
        articles: [],
        selfId: "a1",
        markdownIssues: [{ code: "unsupported-node", point: { line: 1, column: 1 } }],
        knownTagIds: [],
        publishableProjectIds: [],
      },
    );

    expect(issues.length).toBeGreaterThan(5);
    issues.forEach((issue) => {
      expect(publishIssueMessage(issue), issue.code).not.toContain("undefined");
    });
  });
});
