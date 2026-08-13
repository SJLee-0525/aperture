import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchDevArticleTags,
  fetchPublishedDevArticles,
  toDevArticle,
} from "@/lib/firebase/public/dev-articles";

/**
 * fetch 모킹에 사용할 JSON 응답을 만든다.
 *
 * @param {unknown} body 직렬화할 응답 본문.
 * @returns {Response} JSON 콘텐츠 타입을 가진 테스트 응답.
 */
const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("toDevArticle", () => {
  it("timestamp 문자열을 Date 로 바꾸고 nullable 날짜는 null 을 보존한다", () => {
    const article = toDevArticle("a1", {
      slug: "serverless-portfolio",
      title: { ko: "제목", en: "Title" },
      summary: { ko: "요약", en: "Summary" },
      body: "# 본문",
      cover: null,
      coverAlt: null,
      tags: ["firebase"],
      relatedProjectIds: ["p1"],
      published: true,
      publishedAt: "2026-01-05T09:00:00.000Z",
      firstPublishedAt: "2026-01-05T09:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-06T00:00:00.000Z",
    });

    expect(article.publishedAt?.toISOString()).toBe("2026-01-05T09:00:00.000Z");
    expect(article.firstPublishedAt?.toISOString()).toBe("2026-01-05T09:00:00.000Z");
    expect(article.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(article.cover).toBeNull();
    expect(article.coverAlt).toBeNull();
  });

  it("필드가 비어 있어도 기본값으로 채워 초안 분기가 성립한다", () => {
    const article = toDevArticle("draft", {});

    expect(article).toMatchObject({
      id: "draft",
      slug: "",
      title: { ko: "", en: "" },
      body: "",
      tags: [],
      relatedProjectIds: [],
      published: false,
      publishedAt: null,
      firstPublishedAt: null,
    });
  });

  it("coverAlt 가 있으면 LocalizedText 로 디코딩한다", () => {
    const article = toDevArticle("a1", { coverAlt: { ko: "설명", en: "Alt" } });
    expect(article.coverAlt).toEqual({ ko: "설명", en: "Alt" });
  });
});

describe("fetchPublishedDevArticles", () => {
  it("publishedAt desc + __name__ asc 정렬을 쿼리에 명시한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPublishedDevArticles();

    const structuredQuery = JSON.parse(
      fetchMock.mock.calls[0]?.[1]?.body as string,
    ).structuredQuery;
    expect(structuredQuery.from).toEqual([{ collectionId: "devArticles" }]);
    expect(structuredQuery.where.fieldFilter.field.fieldPath).toBe("published");
    expect(structuredQuery.orderBy).toEqual([
      { field: { fieldPath: "publishedAt" }, direction: "DESCENDING" },
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
    ]);
    expect("select" in structuredQuery).toBe(false);
  });
});

describe("fetchDevArticleTags", () => {
  it("published 필터 없이 문서 ID 오름차순으로 읽고 라벨을 디코딩한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          document: {
            name: "projects/demo/databases/(default)/documents/devArticleTags/firebase",
            fields: { ko: { stringValue: "Firebase" }, en: { stringValue: "Firebase" } },
          },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tags = await fetchDevArticleTags();

    const structuredQuery = JSON.parse(
      fetchMock.mock.calls[0]?.[1]?.body as string,
    ).structuredQuery;
    expect("where" in structuredQuery).toBe(false);
    expect(structuredQuery.orderBy).toEqual([
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
    ]);
    expect(tags).toEqual([{ id: "firebase", ko: "Firebase", en: "Firebase" }]);
  });
});
