import { describe, expect, it } from "vitest";

import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import {
  checkArticlePublishable,
  type PublishCheckContext,
} from "@/features/admin-dev-articles/_lib/dev-article-publish-check";

const COVER = { url: "https://example.test/a.webp", path: "dev-blog/a/1.webp", w: 2048, h: 1365 };

const input = (overrides: Partial<DevArticleInput> = {}): DevArticleInput => ({
  slug: "serverless-portfolio",
  title: { ko: "서버 없는 포트폴리오", en: "Serverless portfolio" },
  summary: { ko: "요약", en: "Summary" },
  body: "## 제목\n\n본문",
  cover: null,
  coverAlt: null,
  tags: ["nextjs"],
  relatedProjectIds: ["aperture"],
  published: true,
  publishedAt: new Date("2026-01-20T10:00:00.000Z"),
  firstPublishedAt: null,
  ...overrides,
});

const context = (overrides: Partial<PublishCheckContext> = {}): PublishCheckContext => ({
  articles: [{ id: "a1", slug: "serverless-portfolio" }],
  selfId: "a1",
  markdownIssues: [],
  knownTagIds: ["nextjs", "css"],
  publishableProjectIds: ["aperture", "jh-portfolio"],
  ...overrides,
});

const codes = (...args: Parameters<typeof checkArticlePublishable>) =>
  checkArticlePublishable(...args).map((issue) => issue.code);

describe("checkArticlePublishable", () => {
  it("모든 조건을 만족하면 사유가 없다", () => {
    expect(checkArticlePublishable(input(), context())).toEqual([]);
  });

  it("한쪽 언어만 채운 제목·요약을 막는다", () => {
    expect(codes(input({ title: { ko: "제목", en: "" } }), context())).toContain("title-missing");
    expect(codes(input({ summary: { ko: "", en: "Summary" } }), context())).toContain(
      "summary-missing",
    );
  });

  it("빈 주소를 막는다", () => {
    expect(codes(input({ slug: "" }), context())).toContain("slug-missing");
  });

  it("다른 글이 쓰는 주소를 막고 어떤 값인지 알려 준다", () => {
    const issues = checkArticlePublishable(
      input({ slug: "css-modules" }),
      context({
        articles: [
          { id: "a1", slug: "serverless-portfolio" },
          { id: "a2", slug: "css-modules" },
        ],
      }),
    );

    expect(issues).toContainEqual({ code: "slug-duplicated", detail: "css-modules" });
  });

  it("자기 주소는 중복으로 보지 않는다", () => {
    expect(codes(input(), context())).not.toContain("slug-duplicated");
  });

  it("빈 본문과 발행일 없음을 막는다", () => {
    const issues = codes(input({ body: "   ", publishedAt: null }), context());

    expect(issues).toContain("body-missing");
    expect(issues).toContain("published-at-missing");
  });

  it("대표 이미지가 있으면 대체 텍스트를 요구한다", () => {
    expect(codes(input({ cover: COVER, coverAlt: null }), context())).toContain(
      "cover-alt-missing",
    );
    expect(codes(input({ cover: COVER, coverAlt: { ko: "설명", en: "" } }), context())).toContain(
      "cover-alt-missing",
    );
    expect(
      codes(input({ cover: COVER, coverAlt: { ko: "설명", en: "Alt" } }), context()),
    ).not.toContain("cover-alt-missing");
  });

  it("대표 이미지가 없으면 대체 텍스트를 요구하지 않는다", () => {
    expect(codes(input(), context())).not.toContain("cover-alt-missing");
  });

  it("Markdown 검증 결과가 하나라도 있으면 막는다", () => {
    const issues = codes(
      input(),
      context({
        markdownIssues: [{ code: "image-alt-missing", point: { line: 3, column: 1 } }],
      }),
    );

    expect(issues).toContain("markdown-blocked");
  });

  it("사전에 없는 태그를 태그마다 알려 준다", () => {
    const issues = checkArticlePublishable(input({ tags: ["nextjs", "webmcp"] }), context());

    expect(issues).toContainEqual({ code: "tag-unknown", detail: "webmcp" });
  });

  it("공개할 수 없는 연관 프로젝트를 알려 준다", () => {
    const issues = checkArticlePublishable(
      input({ relatedProjectIds: ["aperture", "secret"] }),
      context(),
    );

    expect(issues).toContainEqual({ code: "related-project-unavailable", detail: "secret" });
  });
});
