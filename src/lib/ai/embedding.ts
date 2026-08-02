const OPENAI_EMBEDDINGS_API_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

type GenerateEmbeddingOptions = {
  apiKey?: string;
  model?: string;
  provider?: string;
  signal?: AbortSignal;
};

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
  const model =
    options?.model ?? process.env.EMBEDDING_PROVIDER_MODEL?.trim() ?? DEFAULT_EMBEDDING_MODEL;

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

export { DEFAULT_EMBEDDING_MODEL, generateEmbedding, generateEmbeddings, EmbeddingError };
