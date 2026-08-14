import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyAdminIdToken: vi.fn(),
  getRagSourceData: vi.fn(),
  getRagSourceDataForTarget: vi.fn(),
  buildRagChunks: vi.fn(),
  generateEmbeddings: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/auth/verify-admin-id-token", () => ({
  verifyAdminIdToken: mocks.verifyAdminIdToken,
}));
vi.mock("@/lib/content/rag-source", () => ({
  getRagSourceData: mocks.getRagSourceData,
  getRagSourceDataForTarget: mocks.getRagSourceDataForTarget,
}));
vi.mock("@/lib/ai/rag-chunks", () => ({ buildRagChunks: mocks.buildRagChunks }));
vi.mock("@/lib/ai/embedding", () => ({
  embeddingModelKey: () => "text-embedding-3-small@512",
  generateEmbeddings: mocks.generateEmbeddings,
}));

import { GET, POST } from "@/app/api/admin/portfolio-embeddings/route";
import { MOCK_DEV_ARTICLE_TAGS } from "@/mocks/dev-article-tags";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

const request = () =>
  new Request("http://localhost/api/admin/portfolio-embeddings", {
    method: "POST",
    headers: { Authorization: "Bearer admin-token" },
  });

/** 청크 조립은 mock 이 대신하지만 route 가 블로그 글을 직접 훑으므로 두 배열은 실제로 필요하다. */
const EMPTY_SOURCE = { source: true, devArticles: [], devArticleTags: [] };

describe("POST /api/admin/portfolio-embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "firebase-key";
  });

  it("관리자가 아니면 임베딩을 생성하지 않는다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(false);

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.generateEmbeddings).not.toHaveBeenCalled();
  });

  it("전체 청크를 배치 임베딩하고 기존 문서를 원자적으로 교체한다", async () => {
    const chunks = [
      {
        id: "profile-site-intro",
        section: "profile",
        sourceType: "profile",
        sourceId: "site",
        chunkKey: "intro",
        text: "프로필 소개",
      },
      {
        id: "development-project-overview",
        section: "development",
        sourceType: "project",
        sourceId: "project-1",
        chunkKey: "overview",
        text: "프로젝트 소개",
      },
    ];
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue(chunks);
    mocks.generateEmbeddings.mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          documents: [
            {
              name: "projects/test-project/databases/(default)/documents/ragDocuments/stale",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      count: 2,
      dimensions: 2,
      model: "text-embedding-3-small@512",
      sections: { profile: 1, development: 1, music: 0, photography: 0 },
    });
    expect(mocks.generateEmbeddings).toHaveBeenCalledWith(["프로필 소개", "프로젝트 소개"], {
      signal: expect.any(AbortSignal),
    });
    const commitBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      writes: Array<{ delete?: string; update?: { name: string } }>;
    };
    expect(commitBody.writes).toHaveLength(3);
    expect(commitBody.writes[0]).toEqual({
      delete: "projects/test-project/databases/(default)/documents/ragDocuments/stale",
    });
    expect(commitBody.writes[1]?.update?.name).toContain(
      "/documents/ragDocuments/profile-site-intro",
    );
    expect(mocks.revalidateTag).toHaveBeenCalled();
  });

  it("지정한 콘텐츠의 청크만 임베딩하고 같은 원본의 이전 청크만 교체한다", async () => {
    const targetChunk = {
      id: "photography-photo-photo-1-photo",
      section: "photography",
      sourceType: "photo",
      sourceId: "photo-1",
      chunkKey: "photo",
      text: "Canon EOS R6 사진",
    };
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceDataForTarget.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([
      targetChunk,
      { ...targetChunk, id: "other", sourceId: "photo-2", text: "다른 사진" },
    ]);
    mocks.generateEmbeddings.mockResolvedValue([[0.1, 0.2]]);
    const field = (stringValue: string) => ({ stringValue });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            document: {
              name: "projects/test-project/databases/(default)/documents/ragDocuments/old-photo-1",
              fields: { sourceType: field("photo"), sourceId: field("photo-1") },
            },
          },
        ],
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/admin/portfolio-embeddings", {
        method: "POST",
        headers: {
          Authorization: "Bearer admin-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: { sourceType: "photo", sourceId: "photo-1" } }),
      }),
    );
    const result = await response.json();

    expect(result).toMatchObject({ count: 1, mode: "incremental" });
    expect(mocks.generateEmbeddings).toHaveBeenCalledWith(["Canon EOS R6 사진"], expect.anything());
    const commitBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      writes: Array<{ delete?: string; update?: { name: string } }>;
    };
    expect(commitBody.writes).toHaveLength(2);
    expect(commitBody.writes[0]?.delete).toContain("/ragDocuments/old-photo-1");
    expect(JSON.stringify(commitBody)).not.toContain("other-photo");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("documents:runQuery");
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('"stringValue":"photo-1"');
  });

  it("지원하지 않는 소스 타입은 거부한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost/api/admin/portfolio-embeddings", {
        method: "POST",
        headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
        body: JSON.stringify({ target: { sourceType: "unknown", sourceId: "x" } }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.generateEmbeddings).not.toHaveBeenCalled();
  });

  it("블로그 글 청크를 전체 생성 대상에 함께 넣는다", async () => {
    const article = MOCK_DEV_ARTICLES.find(({ published }) => published)!;
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue({
      devArticles: [article],
      devArticleTags: MOCK_DEV_ARTICLE_TAGS,
    });
    mocks.buildRagChunks.mockReturnValue([]);
    mocks.generateEmbeddings.mockImplementation(async (texts: string[]) => texts.map(() => [0.1]));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ documents: [] }) })
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = (await (await POST(request())).json()) as { count: number };

    expect(result.count).toBeGreaterThan(0);
    const [texts] = mocks.generateEmbeddings.mock.calls[0] as [string[]];
    expect(texts.some((text) => text.includes(`/dev/articles/${article.slug}`))).toBe(true);
  });

  it("블로그 글 타깃은 같은 글의 이전 청크만 지운다", async () => {
    const article = MOCK_DEV_ARTICLES.find(({ published }) => published)!;
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceDataForTarget.mockResolvedValue({
      devArticles: [article],
      devArticleTags: MOCK_DEV_ARTICLE_TAGS,
    });
    mocks.buildRagChunks.mockReturnValue([]);
    mocks.generateEmbeddings.mockImplementation(async (texts: string[]) => texts.map(() => [0.1]));
    const field = (stringValue: string) => ({ stringValue });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          {
            document: {
              name: "projects/test-project/databases/(default)/documents/ragDocuments/stale-article",
              fields: { sourceType: field("article"), sourceId: field(article.id) },
            },
          },
          {
            document: {
              name: "projects/test-project/databases/(default)/documents/ragDocuments/other-photo",
              fields: { sourceType: field("photo"), sourceId: field("photo-1") },
            },
          },
        ],
      })
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("http://localhost/api/admin/portfolio-embeddings", {
        method: "POST",
        headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
        body: JSON.stringify({ target: { sourceType: "article", sourceId: article.id } }),
      }),
    );

    const commit = JSON.stringify(
      fetchMock.mock.calls.slice(1).map(([, init]) => (init as { body: string }).body),
    );
    expect(commit).toContain("stale-article");
    expect(commit).not.toContain("other-photo");
  });

  it("상태 조회의 전체 개수에도 블로그 글 청크가 들어간다", async () => {
    const article = MOCK_DEV_ARTICLES.find(({ published }) => published)!;
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue({
      devArticles: [article],
      devArticleTags: MOCK_DEV_ARTICLE_TAGS,
    });
    mocks.buildRagChunks.mockReturnValue([]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ documents: [] }) }),
    );

    const status = (await (await GET(request())).json()) as { total: number };

    // 조립을 POST 한쪽에만 넣으면 생성은 되는데 진행률이 계속 100%에 닿지 않는다.
    expect(status.total).toBeGreaterThan(0);
  });

  it("OpenAI 호출 없이 현재 임베딩 완료 비율을 계산한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue([
      {
        id: "ready",
        section: "profile",
        sourceType: "profile",
        sourceId: "site",
        chunkKey: "a",
        text: "a",
      },
      {
        id: "missing",
        section: "music",
        sourceType: "musicWork",
        sourceId: "work",
        chunkKey: "b",
        text: "b",
      },
    ]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            documents: [
              {
                name: "projects/test-project/databases/(default)/documents/ragDocuments/ready",
                fields: { embeddingModel: { stringValue: "text-embedding-3-small@512" } },
              },
            ],
            nextPageToken: "next-page",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            documents: [
              {
                name: "projects/test-project/databases/(default)/documents/ragDocuments/missing",
                fields: { embeddingModel: { stringValue: "text-embedding-3-small@512" } },
              },
            ],
          }),
        }),
    );

    const response = await GET(request());

    await expect(response.json()).resolves.toMatchObject({
      completed: 2,
      pending: 0,
      percent: 100,
      total: 2,
    });
    expect(mocks.generateEmbeddings).not.toHaveBeenCalled();
  });

  it("대량 벡터 쓰기를 Firestore 안전 크기의 여러 커밋으로 나눈다", async () => {
    const chunks = Array.from({ length: 201 }, (_, index) => ({
      id: `photo-${index}`,
      section: "photography",
      sourceType: "photo",
      sourceId: `photo-${index}`,
      chunkKey: "photo",
      text: `사진 ${index}`,
    }));
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue(EMPTY_SOURCE);
    mocks.buildRagChunks.mockReturnValue(chunks);
    mocks.generateEmbeddings.mockResolvedValue(chunks.map(() => [0.1, 0.2]));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ documents: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstCommit = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      writes: unknown[];
    };
    const secondCommit = JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string) as {
      writes: unknown[];
    };
    expect(firstCommit.writes).toHaveLength(200);
    expect(secondCommit.writes).toHaveLength(1);
  });
});
