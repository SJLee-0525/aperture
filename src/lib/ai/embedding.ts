const OPENAI_EMBEDDINGS_API_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
/**
 * MRL 잘라내기 기본 차원 — text-embedding-3 는 접두사가 완결된 임베딩이 되도록 학습돼
 * 512 로 줄여도 이 코퍼스 규모(수백 청크)에선 품질 손실이 측정 불가 수준이고
 * 저장·전송·스냅샷 크기는 1/3 이 된다. EMBEDDING_PROVIDER_DIMENSIONS 로 조정.
 */
const DEFAULT_EMBEDDING_DIMENSIONS = 512;

type GenerateEmbeddingOptions = {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  provider?: string;
  signal?: AbortSignal;
};

const resolveEmbeddingModel = (model?: string): string =>
  model?.trim() || process.env.EMBEDDING_PROVIDER_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

const resolveEmbeddingDimensions = (dimensions?: number): number => {
  const configured = dimensions ?? Number(process.env.EMBEDDING_PROVIDER_DIMENSIONS);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_EMBEDDING_DIMENSIONS;
};

/**
 * 저장·검색이 공유하는 벡터 공간 호환성 키 — 모델과 차원이 모두 일치해야 비교 가능하다.
 * ragDocuments.embeddingModel 에 이 키를 저장하고, 검색·상태 API 는 같은 키의 청크만 인정한다.
 * 모델이나 차원을 바꾸면 키가 어긋나 기존 청크가 자동 배제되고, 전체 재생성이 이행 경로다.
 *
 * @returns {string}
 */
const embeddingModelKey = (): string =>
  `${resolveEmbeddingModel()}@${resolveEmbeddingDimensions()}`;

class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

/**
 * 텍스트 입력을 OpenAI 임베딩 벡터로 변환합니다.
 *
 * @param {string} text
 * @param {GenerateEmbeddingOptions} [options]
 * @returns {Promise<number[]>}
 */
const generateEmbedding = async (
  text: string,
  options?: GenerateEmbeddingOptions,
): Promise<number[]> => (await generateEmbeddings([text], options))[0] ?? [];

const generateEmbeddings = async (
  texts: string[],
  options?: GenerateEmbeddingOptions,
): Promise<number[][]> => {
  if (texts.length === 0) return [];
  const apiKey = options?.apiKey ?? process.env.EMBEDDING_PROVIDER_API_KEY?.trim();
  if (!apiKey) {
    throw new EmbeddingError("EMBEDDING_PROVIDER_API_KEY is required for embedding generation");
  }

  const provider = options?.provider ?? process.env.EMBEDDING_PROVIDER?.trim() ?? "openai";
  if (provider !== "openai") {
    throw new EmbeddingError(`Unsupported embedding provider: ${provider}`);
  }
  const model = resolveEmbeddingModel(options?.model);
  const dimensions = resolveEmbeddingDimensions(options?.dimensions);

  const response = await fetch(OPENAI_EMBEDDINGS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
      encoding_format: "float",
      dimensions,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new EmbeddingError(
      `Embedding API request failed with status ${response.status}`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
  };

  const vectors = data.data
    ?.toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(({ embedding }) => embedding);
  if (
    !vectors ||
    vectors.length !== texts.length ||
    vectors.some((values) => !Array.isArray(values) || values.length === 0)
  ) {
    throw new EmbeddingError("Embedding API returned no vector values");
  }

  return vectors as number[][];
};

export { embeddingModelKey, generateEmbedding, generateEmbeddings, EmbeddingError };
