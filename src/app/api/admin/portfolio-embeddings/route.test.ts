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
  DEFAULT_EMBEDDING_MODEL: "text-embedding-3-small",
  generateEmbeddings: mocks.generateEmbeddings,
}));

import { GET, POST } from "@/app/api/admin/portfolio-embeddings/route";

const request = () =>
  new Request("http://localhost/api/admin/portfolio-embeddings", {
    method: "POST",
    headers: { Authorization: "Bearer admin-token" },
  });

describe("POST /api/admin/portfolio-embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "firebase-key";
    process.env.EMBEDDING_PROVIDER_MODEL = "text-embedding-3-small";
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
    mocks.getRagSourceData.mockResolvedValue({ source: true });
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
      model: "text-embedding-3-small",
      sections: { profile: 1, development: 1, music: 0, photography: 0 },
    });
    expect(mocks.generateEmbeddings).toHaveBeenCalledWith(["프로필 소개", "프로젝트 소개"], {
      model: "text-embedding-3-small",
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
    mocks.getRagSourceDataForTarget.mockResolvedValue({ source: true });
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

  it("OpenAI 호출 없이 현재 임베딩 완료 비율을 계산한다", async () => {
    mocks.verifyAdminIdToken.mockResolvedValue(true);
    mocks.getRagSourceData.mockResolvedValue({ source: true });
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
                fields: { embeddingModel: { stringValue: "text-embedding-3-small" } },
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
                fields: { embeddingModel: { stringValue: "text-embedding-3-small" } },
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
    mocks.getRagSourceData.mockResolvedValue({ source: true });
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
