import { afterEach, describe, expect, it, vi } from "vitest";

import { generateEmbedding, EmbeddingError } from "@/lib/ai/embedding";

describe("generateEmbedding", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("API 키가 설정되지 않은 경우 EmbeddingError를 던진다", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER_API_KEY", "");
    await expect(generateEmbedding("테스트 문장")).rejects.toThrow(EmbeddingError);
  });

  it("채팅 제공자 키를 임베딩 키의 폴백으로 사용하지 않는다", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER_API_KEY", "");
    vi.stubEnv("CHAT_PROVIDER_API_KEY", "chat-only-key");

    await expect(generateEmbedding("테스트 문장")).rejects.toThrow(
      "EMBEDDING_PROVIDER_API_KEY is required",
    );
  });

  it("OpenAI API 호출 성공 시 1536 차원의 임베딩 배열을 반환한다", async () => {
    const mockValues = new Array(1536).fill(0.1);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: mockValues }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateEmbedding("바다 사진 추천해줘", { apiKey: "test-api-key" });
    expect(result).toHaveLength(1536);
    expect(result[0]).toBe(0.1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }),
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: ["바다 사진 추천해줘"],
          encoding_format: "float",
        }),
      }),
    );
  });

  it("OpenAI API 실패 시 HTTP 상태 코드를 포함한 EmbeddingError를 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    );

    await expect(
      generateEmbedding("바다 사진 추천해줘", { apiKey: "test-api-key" }),
    ).rejects.toThrow(EmbeddingError);
  });
});
