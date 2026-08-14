import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchPublishedDevArticles: vi.fn(),
  fetchDevArticleTags: vi.fn(),
}));

vi.mock("@/lib/firebase/public/dev-articles", async () => {
  const actual = await vi.importActual<typeof import("@/lib/firebase/public/dev-articles")>(
    "@/lib/firebase/public/dev-articles",
  );
  return {
    ...actual,
    fetchPublishedDevArticles: mocks.fetchPublishedDevArticles,
    fetchDevArticleTags: mocks.fetchDevArticleTags,
  };
});

import { getRagSourceDataForTarget } from "@/lib/content/rag-source";

import { MOCK_DEV_ARTICLE_TAGS } from "@/mocks/dev-article-tags";

/** 문서 필드를 그대로 돌려주는 Firestore REST 응답. `null` 은 삭제된 글이다. */
const stubFirestore = (fields: Record<string, unknown> | null) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        fields
          ? { ok: true, status: 200, json: async () => ({ fields }) }
          : { ok: true, status: 404, json: async () => ({}) },
      ),
  );
};

describe("getRagSourceDataForTarget — 블로그 글", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "firebase-key";
    mocks.fetchDevArticleTags.mockResolvedValue(MOCK_DEV_ARTICLE_TAGS);
  });

  it("공개된 글은 태그 사전과 함께 돌려준다", async () => {
    stubFirestore({
      slug: { stringValue: "chunking" },
      published: { booleanValue: true },
    });

    const data = await getRagSourceDataForTarget(
      { sourceType: "article", sourceId: "a1" },
      "token",
    );

    expect(data.devArticles.map(({ id, slug }) => ({ id, slug }))).toEqual([
      { id: "a1", slug: "chunking" },
    ]);
    expect(data.devArticleTags).toEqual(MOCK_DEV_ARTICLE_TAGS);
    // 다른 컬렉션은 이 타깃의 범위 밖이라 비어 있어야 한다.
    expect(data.devProjects).toEqual([]);
    expect(data.photos).toEqual([]);
  });

  it("초안은 빈 결과라 청크가 지워진다", async () => {
    stubFirestore({ published: { booleanValue: false } });

    const data = await getRagSourceDataForTarget(
      { sourceType: "article", sourceId: "a1" },
      "token",
    );

    expect(data.devArticles).toEqual([]);
  });

  it("삭제된 글도 빈 결과다", async () => {
    stubFirestore(null);

    const data = await getRagSourceDataForTarget(
      { sourceType: "article", sourceId: "gone" },
      "token",
    );

    expect(data.devArticles).toEqual([]);
  });
});
