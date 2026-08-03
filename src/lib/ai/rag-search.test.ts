import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateEmbedding: vi.fn(),
  getRagIndex: vi.fn(),
}));

vi.mock("@/lib/ai/embedding", () => ({
  embeddingModelKey: () => "text-embedding-3-small@512",
  generateEmbedding: mocks.generateEmbedding,
}));
vi.mock("@/lib/ai/rag-index", () => ({ getRagIndex: mocks.getRagIndex }));

import { cosineSimilarity, searchRagChunks } from "@/lib/ai/rag-search";

const entry = (overrides: {
  id: string;
  section?: string;
  text?: string;
  embeddingModel?: string;
  vector?: number[];
}) => ({
  chunk: {
    id: overrides.id,
    section: overrides.section ?? "photography",
    sourceType: "photo",
    sourceId: overrides.id,
    chunkKey: "photo",
    text: overrides.text ?? "사진",
    embeddingModel: overrides.embeddingModel ?? "text-embedding-3-small@512",
    published: true,
  },
  vector: Float32Array.from(overrides.vector ?? [1, 0]),
});

describe("cosineSimilarity", () => {
  it("동일 벡터는 1, 직교 벡터와 차원이 다른 벡터는 0을 반환한다", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1], [1, 0])).toBe(0);
  });

  it("Float32Array 벡터도 동일하게 비교한다", () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), [1, 0])).toBeCloseTo(1);
  });
});

describe("searchRagChunks", () => {
  it("허용 섹션 중 모델키가 일치하는 청크만 유사도 순으로 반환한다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([
      entry({ id: "match", vector: [1, 0] }),
      entry({ id: "stale-key", vector: [1, 0], embeddingModel: "text-embedding-3-small" }),
      entry({ id: "other-section", vector: [1, 0], section: "music" }),
      entry({ id: "low-score", vector: [0, 1] }),
    ]);

    const result = await searchRagChunks("바다 사진", ["photography"]);

    expect(result.map(({ id }) => id)).toEqual(["match"]);
  });

  it("벡터 점수가 낮아도 키워드 점수가 높으면 후보로 남긴다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([
      entry({ id: "keyword-hit", vector: [0, 1], text: "울릉도 사진 Ulleungdo" }),
    ]);

    const result = await searchRagChunks("울릉도", ["photography"]);

    expect(result.map(({ id }) => id)).toEqual(["keyword-hit"]);
  });
});
