import { afterEach, describe, expect, it, vi } from "vitest";

import {
  embeddingModelKey,
  EmbeddingError,
  generateEmbedding,
  generateEmbeddings,
} from "@/lib/ai/embedding";

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

  it("OpenAI API 호출 성공 시 기본 512 차원 요청으로 임베딩 배열을 반환한다", async () => {
    const mockValues = new Array(512).fill(0.1);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: mockValues }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateEmbedding("바다 사진 추천해줘", { apiKey: "test-api-key" });
    expect(result).toHaveLength(512);
    expect(result[0]).toBe(0.1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }),
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: ["바다 사진 추천해줘"],
          encoding_format: "float",
          dimensions: 512,
        }),
      }),
    );
  });

  it("빈 문자열 모델·차원 환경변수는 기본값으로 폴백한다", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER_MODEL", "");
    vi.stubEnv("EMBEDDING_PROVIDER_DIMENSIONS", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateEmbedding("테스트", { apiKey: "test-api-key" });

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      model: string;
      dimensions: number;
    };
    expect(body.model).toBe("text-embedding-3-small");
    expect(body.dimensions).toBe(512);
  });

  it("환경변수로 차원을 재정의할 수 있다", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER_DIMENSIONS", "1536");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateEmbedding("테스트", { apiKey: "test-api-key" });

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      dimensions: number;
    };
    expect(body.dimensions).toBe(1536);
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

describe("embeddingModelKey", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("모델과 차원을 합친 벡터 공간 호환성 키를 만든다", () => {
    expect(embeddingModelKey()).toBe("text-embedding-3-small@512");
  });

  it("환경변수 모델·차원을 반영하고 빈 문자열은 기본값으로 폴백한다", () => {
    vi.stubEnv("EMBEDDING_PROVIDER_MODEL", "text-embedding-3-large");
    vi.stubEnv("EMBEDDING_PROVIDER_DIMENSIONS", "1024");
    expect(embeddingModelKey()).toBe("text-embedding-3-large@1024");

    vi.stubEnv("EMBEDDING_PROVIDER_MODEL", "");
    vi.stubEnv("EMBEDDING_PROVIDER_DIMENSIONS", "");
    expect(embeddingModelKey()).toBe("text-embedding-3-small@512");
  });
});

describe("generateEmbeddings — 배치", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  /**
   * 배치가 없으면 청크 전량이 한 요청에 실려 콘텐츠가 늘었을 때 전체 재생성이 통째로
   * 실패한다. 그 경로가 임베딩 모델·차원을 바꿀 수 있는 유일한 수단이다.
   */
  it("100개 단위로 나눠 순차 호출하고 순서를 보존한다", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER_API_KEY", "key");
    const texts = Array.from({ length: 250 }, (_, index) => `문장 ${index}`);
    let call = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { input: string[] };
      const batchIndex = call++;
      // 응답 순서를 뒤집어 보낸다. index 정렬이 없으면 결과가 섞인다.
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: body.input
            .map((text, index) => ({
              embedding: [batchIndex, index, Number(text.split(" ")[1])],
              index,
            }))
            .toReversed(),
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const vectors = await generateEmbeddings(texts);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body)).input).toHaveLength(100);
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1].body)).input).toHaveLength(50);
    expect(vectors).toHaveLength(250);
    // 각 벡터의 세 번째 값이 원래 문장 번호다. 순서가 유지되면 0..249 가 그대로 나온다.
    expect(vectors.map((vector) => vector[2])).toEqual(texts.map((_, index) => index));
  });

  it("빈 입력에는 요청을 보내지 않는다", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER_API_KEY", "key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateEmbeddings([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
