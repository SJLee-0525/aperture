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
  sourceType?: string;
  sourceId?: string;
}) => ({
  chunk: {
    id: overrides.id,
    section: overrides.section ?? "photography",
    sourceType: overrides.sourceType ?? "photo",
    sourceId: overrides.sourceId ?? overrides.id,
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

    const result = await searchRagChunks({ text: "바다 사진" }, ["photography"]);

    expect(result.map(({ id }) => id)).toEqual(["match"]);
  });

  it("벡터 점수가 낮아도 키워드 점수가 높으면 후보로 남긴다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([
      entry({ id: "keyword-hit", vector: [0, 1], text: "울릉도 사진 Ulleungdo" }),
    ]);

    const result = await searchRagChunks({ text: "울릉도" }, ["photography"]);

    expect(result.map(({ id }) => id)).toEqual(["keyword-hit"]);
  });

  it("질문 원문이 빗나가도 분류기 키워드로 청크를 찾는다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([
      entry({ id: "award", vector: [0, 1], text: "2025 우수상(2위) SSAFY 12기", section: "music" }),
    ]);

    const result = await searchRagChunks(
      { text: "그건 언제 받았어?", keywords: ["우수상", "수상"] },
      ["music"],
    );

    expect(result.map(({ id }) => id)).toEqual(["award"]);
  });

  it("분류기 키워드가 빗나가도 로컬 토큰화 점수가 폴백으로 남는다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([
      entry({ id: "keyword-hit", vector: [0, 1], text: "울릉도 사진 Ulleungdo" }),
    ]);

    const result = await searchRagChunks({ text: "울릉도", keywords: ["엉뚱한말"] }, [
      "photography",
    ]);

    expect(result.map(({ id }) => id)).toEqual(["keyword-hit"]);
  });
});

describe("searchRagChunks — 열린 항목 우선 검색", () => {
  const article = (id: string, vector: number[]) =>
    entry({ id, section: "development", sourceType: "article", sourceId: "a1", vector });
  // 질의 벡터와 직교라 최소 점수 기준을 넘지 못하는 청크들.
  const weakArticles = [article("a1-0", [0, 1]), article("a1-1", [0, 1]), article("a1-2", [0, 1])];
  const strong = Array.from({ length: 8 }, (_, index) =>
    entry({ id: `p${index}`, section: "development", sourceType: "project", vector: [1, 0] }),
  );

  it("우선 대상이 없으면 기존 결과와 같다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([...weakArticles, ...strong]);

    const chunks = await searchRagChunks({ text: "질문" }, ["development"]);

    expect(chunks).toHaveLength(8);
    expect(chunks.every(({ sourceType }) => sourceType === "project")).toBe(true);
  });

  it("지시어 질의는 최소 점수 기준을 넘지 못한 우선 대상도 앞자리를 받는다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([...weakArticles, ...strong]);

    const chunks = await searchRagChunks({ text: "이 글 요약해 줘" }, ["development"], undefined, {
      prioritize: { sourceType: "article", sourceId: "a1", ignoreScoreFloor: true },
    });

    // 자르기 전에 나누지 않으면 전체 상위 8개가 프로젝트로 채워져 글이 한 건도 남지 않는다.
    expect(chunks.slice(0, 3).map(({ id }) => id)).toEqual(["a1-0", "a1-1", "a1-2"]);
    expect(chunks).toHaveLength(8);
    expect(chunks.slice(3).every(({ sourceType }) => sourceType === "project")).toBe(true);
  });

  it("질문이 대상을 직접 말하면 우선 대상도 최소 점수 기준을 넘어야 한다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([...weakArticles, ...strong]);

    const chunks = await searchRagChunks(
      { text: "무슨 프로젝트 했어?" },
      ["development"],
      undefined,
      {
        prioritize: { sourceType: "article", sourceId: "a1" },
      },
    );

    expect(chunks).toHaveLength(8);
    expect(chunks.every(({ sourceType }) => sourceType === "project")).toBe(true);
  });

  it("기준을 넘긴 우선 대상은 면제 없이도 앞자리를 받는다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    const weakerProjects = Array.from({ length: 8 }, (_, index) =>
      entry({ id: `p${index}`, section: "development", sourceType: "project", vector: [0.9, 0.1] }),
    );
    mocks.getRagIndex.mockResolvedValue([article("a1-strong", [1, 0]), ...weakerProjects]);

    const chunks = await searchRagChunks(
      { text: "무슨 프로젝트 했어?" },
      ["development"],
      undefined,
      {
        prioritize: { sourceType: "article", sourceId: "a1" },
      },
    );

    expect(chunks[0].id).toBe("a1-strong");
  });

  it("우선 대상이라도 임베딩 모델이 다르면 제외한다", async () => {
    mocks.generateEmbedding.mockResolvedValue([1, 0]);
    mocks.getRagIndex.mockResolvedValue([
      entry({
        id: "old",
        section: "development",
        sourceType: "article",
        sourceId: "a1",
        embeddingModel: "text-embedding-3-small@1536",
        vector: [1, 0],
      }),
    ]);

    const chunks = await searchRagChunks({ text: "질문" }, ["development"], undefined, {
      prioritize: { sourceType: "article", sourceId: "a1" },
    });

    expect(chunks).toEqual([]);
  });
});
