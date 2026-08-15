import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateEmbedding: vi.fn(),
  matchRagChunks: vi.fn(),
}));

vi.mock("@/lib/ai/embedding", () => ({
  embeddingModelKey: () => "text-embedding-3-small@512",
  generateEmbedding: mocks.generateEmbedding,
}));
vi.mock("@/lib/supabase/rag", () => ({ matchRagChunks: mocks.matchRagChunks }));

import { searchRagChunks } from "@/lib/ai/rag-search";

const candidate = (overrides: {
  id: string;
  vectorScore?: number;
  section?: string;
  text?: string;
  sourceType?: string;
  sourceId?: string;
}) => ({
  id: overrides.id,
  section: overrides.section ?? "photography",
  sourceType: overrides.sourceType ?? "photo",
  sourceId: overrides.sourceId ?? overrides.id,
  chunkKey: "photo",
  text: overrides.text ?? "사진",
  embeddingModel: "text-embedding-3-small@512",
  published: true,
  vectorScore: overrides.vectorScore ?? 1,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.generateEmbedding.mockResolvedValue([1, 0]);
});

describe("searchRagChunks", () => {
  it("모델키·섹션 필터를 RPC 인자로 넘기고 후보를 점수순으로 반환한다", async () => {
    mocks.matchRagChunks.mockResolvedValue([
      candidate({ id: "second", vectorScore: 0.6 }),
      candidate({ id: "first", vectorScore: 0.9 }),
      candidate({ id: "floor-out", vectorScore: 0.1 }),
    ]);

    const result = await searchRagChunks({ text: "바다 사진" }, ["photography"]);

    expect(result.map(({ id }) => id)).toEqual(["first", "second"]);
    expect(mocks.matchRagChunks).toHaveBeenCalledWith(
      expect.objectContaining({
        queryVector: [1, 0],
        sections: ["photography"],
        modelKey: "text-embedding-3-small@512",
      }),
    );
  });

  it("벡터 점수가 하한 미만이라도 후보 안의 키워드 일치는 구제한다", async () => {
    // 구제는 RPC 가 돌려준 벡터 상위 후보 안에서만 작동한다. 벡터 순위 밖의
    // 키워드 단독 일치는 후보에 없으므로 여기 도달하지 않는다 (checklist 08 M6 기록).
    mocks.matchRagChunks.mockResolvedValue([
      candidate({ id: "keyword-hit", vectorScore: 0.05, text: "울릉도 사진 Ulleungdo" }),
    ]);

    const result = await searchRagChunks({ text: "울릉도" }, ["photography"]);

    expect(result.map(({ id }) => id)).toEqual(["keyword-hit"]);
  });

  it("질문 원문이 빗나가도 분류기 키워드로 후보를 구제한다", async () => {
    mocks.matchRagChunks.mockResolvedValue([
      candidate({
        id: "award",
        vectorScore: 0.05,
        text: "2025 우수상(2위) SSAFY 12기",
        section: "music",
      }),
    ]);

    const result = await searchRagChunks(
      { text: "그건 언제 받았어?", keywords: ["우수상", "수상"] },
      ["music"],
    );

    expect(result.map(({ id }) => id)).toEqual(["award"]);
  });

  it("분류기 키워드가 빗나가도 로컬 토큰화 점수가 폴백으로 남는다", async () => {
    mocks.matchRagChunks.mockResolvedValue([
      candidate({ id: "keyword-hit", vectorScore: 0.05, text: "울릉도 사진 Ulleungdo" }),
    ]);

    const result = await searchRagChunks({ text: "울릉도", keywords: ["엉뚱한말"] }, [
      "photography",
    ]);

    expect(result.map(({ id }) => id)).toEqual(["keyword-hit"]);
  });
});

describe("searchRagChunks — 열린 항목 우선 검색", () => {
  const article = (id: string, vectorScore: number) =>
    candidate({ id, section: "development", sourceType: "article", sourceId: "a1", vectorScore });
  // 하한(vector 0.3)을 넘지 못하는 우선 대상 청크들.
  const weakArticles = [article("a1-0", 0), article("a1-1", 0), article("a1-2", 0)];
  const strong = Array.from({ length: 8 }, (_, index) =>
    candidate({ id: `p${index}`, section: "development", sourceType: "project", vectorScore: 1 }),
  );

  it("우선 대상 쌍을 RPC 에 그대로 전달한다", async () => {
    mocks.matchRagChunks.mockResolvedValue([]);

    await searchRagChunks({ text: "질문" }, ["development"], undefined, {
      prioritize: { sourceType: "article", sourceId: "a1", ignoreScoreFloor: true },
    });

    expect(mocks.matchRagChunks).toHaveBeenCalledWith(
      expect.objectContaining({ prioritize: { sourceType: "article", sourceId: "a1" } }),
    );
  });

  it("우선 대상이 없으면 하한 통과 청크만 남는다", async () => {
    mocks.matchRagChunks.mockResolvedValue([...weakArticles, ...strong]);

    const chunks = await searchRagChunks({ text: "질문" }, ["development"]);

    expect(chunks).toHaveLength(8);
    expect(chunks.every(({ sourceType }) => sourceType === "project")).toBe(true);
  });

  it("하한 통과 청크가 상한을 넘으면 10개에서 자른다", async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      candidate({ id: `p${index}`, section: "development", sourceType: "project", vectorScore: 1 }),
    );
    mocks.matchRagChunks.mockResolvedValue(many);

    const chunks = await searchRagChunks({ text: "질문" }, ["development"]);

    expect(chunks).toHaveLength(10);
  });

  it("지시어 질의는 최소 점수 기준을 넘지 못한 우선 대상도 앞자리를 받는다", async () => {
    mocks.matchRagChunks.mockResolvedValue([...weakArticles, ...strong]);

    const chunks = await searchRagChunks({ text: "이 글 요약해 줘" }, ["development"], undefined, {
      prioritize: { sourceType: "article", sourceId: "a1", ignoreScoreFloor: true },
    });

    // 자르기 전에 나누지 않으면 상한이 프로젝트로 채워져 글이 한 건도 남지 않는다.
    expect(chunks.slice(0, 3).map(({ id }) => id)).toEqual(["a1-0", "a1-1", "a1-2"]);
    expect(chunks).toHaveLength(10);
    expect(chunks.slice(3).every(({ sourceType }) => sourceType === "project")).toBe(true);
  });

  it("질문이 대상을 직접 말하면 우선 대상도 최소 점수 기준을 넘어야 한다", async () => {
    mocks.matchRagChunks.mockResolvedValue([...weakArticles, ...strong]);

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
    const weakerProjects = Array.from({ length: 8 }, (_, index) =>
      candidate({
        id: `p${index}`,
        section: "development",
        sourceType: "project",
        vectorScore: 0.9,
      }),
    );
    mocks.matchRagChunks.mockResolvedValue([article("a1-strong", 1), ...weakerProjects]);

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
});
