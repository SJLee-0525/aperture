import { describe, expect, it } from "vitest";

import { filterAdminArticles } from "@/features/admin-dev-articles/_lib/dev-article-filter";

import type { AdminDevArticleListItem } from "@/types/admin";

const items: AdminDevArticleListItem[] = [
  {
    id: "draft",
    slug: "rag-chunking-draft",
    title: { ko: "청크 나누기", en: "RAG chunking" },
    tags: ["architecture"],
    pinned: false,
    published: false,
    publishedAt: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "published",
    slug: "serverless-portfolio",
    title: { ko: "서버 없는 포트폴리오", en: "Serverless portfolio" },
    tags: ["nextjs"],
    pinned: false,
    published: true,
    publishedAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  },
];

describe("filterAdminArticles", () => {
  it("전체는 그대로 돌려준다", () => {
    expect(filterAdminArticles(items, { status: "all", keyword: "" })).toHaveLength(2);
  });

  it("초안·발행을 나눈다", () => {
    expect(
      filterAdminArticles(items, { status: "draft", keyword: "" }).map((row) => row.id),
    ).toEqual(["draft"]);
    expect(
      filterAdminArticles(items, { status: "published", keyword: "" }).map((row) => row.id),
    ).toEqual(["published"]);
  });

  it("한국어 제목·영어 제목·주소에서 찾는다", () => {
    expect(filterAdminArticles(items, { status: "all", keyword: "청크" })).toHaveLength(1);
    expect(filterAdminArticles(items, { status: "all", keyword: "serverless" })).toHaveLength(1);
    expect(filterAdminArticles(items, { status: "all", keyword: "rag-chunking" })).toHaveLength(1);
  });

  it("대소문자를 가리지 않는다", () => {
    expect(filterAdminArticles(items, { status: "all", keyword: "SERVERLESS" })).toHaveLength(1);
  });

  it("공백만 있는 검색어는 걸러 내지 않는다", () => {
    expect(filterAdminArticles(items, { status: "all", keyword: "   " })).toHaveLength(2);
  });

  it("상태와 검색어를 함께 적용한다", () => {
    expect(filterAdminArticles(items, { status: "draft", keyword: "serverless" })).toHaveLength(0);
  });

  it("걸리는 글이 없으면 빈 배열이다", () => {
    expect(filterAdminArticles(items, { status: "all", keyword: "없는 검색어" })).toEqual([]);
  });
});
