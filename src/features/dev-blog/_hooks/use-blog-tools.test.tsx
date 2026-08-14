// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ArticleToolData } from "@/features/dev-blog/_lib/article-tool-data";
import type { WebMcpExecute } from "@/lib/webmcp/model-context";
import type { DevArticleTag } from "@/types/dev-article-tag";

const adapter = vi.hoisted(() => ({
  registerWebMcpTool: vi.fn<
    (
      definition: import("@/lib/webmcp/model-context").WebMcpToolDefinition,
      execute: import("@/lib/webmcp/model-context").WebMcpExecute,
      signal: AbortSignal,
    ) => boolean
  >(() => true),
}));

vi.mock("@/lib/webmcp/model-context", () => ({
  registerWebMcpTool: adapter.registerWebMcpTool,
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({ lang: "ko", dict: {}, setLang: vi.fn() }),
}));

import { useBlogTools } from "./use-blog-tools";

const articleOf = (
  id: string,
  title: string,
  tagIds: string[],
  tagLabels: string[],
): ArticleToolData => ({
  id,
  slug: id,
  title: { ko: title, en: title },
  summary: { ko: `${title} 요약`, en: `${title} summary` },
  tagIds,
  tagLabels,
  publishedAt: new Date("2026-05-18T00:00:00Z"),
  readingMinutes: 6,
  headings: ["왜 서버를 두지 않았나", "이미지 파이프라인"],
});

const ARTICLES: ArticleToolData[] = [
  articleOf("serverless", "서버 없이 운영한다", ["nextjs"], ["Next.js"]),
  articleOf("chunking", "청크 나누기", ["retrospective"], ["회고", "Retrospective"]),
];

const TAGS: DevArticleTag[] = [
  { id: "nextjs", ko: "Next.js", en: "Next.js" },
  { id: "retrospective", ko: "회고", en: "Retrospective" },
  // 어느 글도 쓰지 않는 태그. 글에서 뽑으면 안내에서 빠진다.
  { id: "accessibility", ko: "접근성", en: "Accessibility" },
];

const executeOf = (name: string): WebMcpExecute => {
  const call = adapter.registerWebMcpTool.mock.calls.find((entry) => entry[0].name === name);
  if (!call) throw new Error(`tool not registered: ${name}`);
  return call[1];
};

describe("useBlogTools", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/ko/dev/articles");
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("읽기 전용 도구 두 개를 등록한다", () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    expect(adapter.registerWebMcpTool.mock.calls.map(([definition]) => definition.name)).toEqual([
      "list_blog_posts",
      "get_blog_post",
    ]);
    expect(
      adapter.registerWebMcpTool.mock.calls.every(
        ([definition]) => definition.annotations.readOnlyHint,
      ),
    ).toBe(true);
  });

  it("목록은 id 와 slug 를 함께 돌려준다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    const result = String(await executeOf("list_blog_posts")({}));

    expect(result).toContain("serverless");
    expect(result).toContain("2026.05.18");
    expect(result).toContain("/ko/dev/articles/serverless");
  });

  it.each([
    ["태그 id", "retrospective"],
    ["한국어 라벨", "회고"],
    ["영어 라벨", "Retrospective"],
  ])("%s 로 태그를 거를 수 있다", async (_label, tag) => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    const result = String(await executeOf("list_blog_posts")({ tag }));

    expect(result).toContain("청크 나누기");
    expect(result).not.toContain("서버 없이 운영한다");
  });

  it("태그 일부만 적은 인자는 거르지 않고 0건으로 안내한다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    // 부분 일치를 허용하면 "a" 한 글자가 거의 모든 태그에 걸려 전체 목록이 그대로 나간다.
    const result = String(await executeOf("list_blog_posts")({ tag: "a" }));

    expect(result).toContain("Known tags:");
    expect(result).not.toContain("청크 나누기");
  });

  it("0건이면 아직 쓰이지 않은 태그까지 사전 전체를 안내한다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    const result = String(await executeOf("list_blog_posts")({ tag: "없는태그" }));

    expect(result).toContain("Known tags:");
    // 글에서 태그를 뽑으면 이 태그가 안내에서 빠진다.
    expect(result).toContain("accessibility");
  });

  it("글이 없어도 태그 사전은 안내한다", async () => {
    renderHook(() => useBlogTools([], TAGS));

    expect(String(await executeOf("list_blog_posts")({}))).toBe("No blog posts are published yet.");
    expect(String(await executeOf("list_blog_posts")({ tag: "회고" }))).toContain("accessibility");
  });

  it("상세를 id 나 slug 로 찾고 목차를 함께 돌려준다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    const byId = String(await executeOf("get_blog_post")({ articleId: "chunking" }));
    const bySlug = String(await executeOf("get_blog_post")({ slug: "chunking" }));

    expect(byId).toBe(bySlug);
    expect(byId).toContain("chunking · chunking");
    expect(byId).toContain("Outline: 왜 서버를 두지 않았나 / 이미지 파이프라인");
  });

  it("두 식별자를 함께 주면 오류다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    // 우연히 같은 글을 가리켜도 오류로 고정한다.
    expect(
      String(await executeOf("get_blog_post")({ articleId: "chunking", slug: "chunking" })),
    ).toContain("not both");
  });

  it("공백만 있는 인자는 넘기지 않은 것으로 본다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    expect(String(await executeOf("get_blog_post")({ articleId: "   ", slug: "  " }))).toContain(
      "No post is open",
    );
  });

  it("없는 id 와 slug 는 그렇게 알려 준다", async () => {
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    expect(String(await executeOf("get_blog_post")({ slug: "zzz" }))).toContain(
      "No published post matches",
    );
  });

  it("상세 지면에서는 인자 없이 현재 글을 읽는다", async () => {
    window.history.replaceState(null, "", "/ko/dev/articles/chunking");
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    expect(String(await executeOf("get_blog_post")({}))).toContain("청크 나누기");
  });

  it("URL 의 slug 가 공개 목록에 없으면 찾지 못했다고 알려 준다", async () => {
    window.history.replaceState(null, "", "/ko/dev/articles/draft-only");
    renderHook(() => useBlogTools(ARTICLES, TAGS));

    expect(String(await executeOf("get_blog_post")({}))).toContain("No published post matches");
  });
});
