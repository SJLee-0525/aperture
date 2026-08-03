import { embeddingModelKey, generateEmbedding } from "@/lib/ai/embedding";
import { getRagIndex } from "@/lib/ai/rag-index";
import { expandRagQuery, keywordSimilarity } from "@/lib/ai/rag-query";
import type { RagSection, StoredRagChunkMeta } from "@/types/rag";

const cosineSimilarity = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
};

const searchRagChunks = async (
  query: string,
  sections: RagSection[],
  signal?: AbortSignal,
): Promise<StoredRagChunkMeta[]> => {
  const modelKey = embeddingModelKey();
  const expandedQuery = expandRagQuery(query);
  const [queryVector, index] = await Promise.all([
    generateEmbedding(expandedQuery, { signal }),
    getRagIndex(),
  ]);
  const allowed = new Set(sections);
  return index
    .flatMap(({ chunk, vector }) => {
      if (!allowed.has(chunk.section) || chunk.embeddingModel !== modelKey) return [];
      const vectorScore = cosineSimilarity(queryVector, vector);
      const keywordScore = keywordSimilarity(query, chunk.text);
      return [{ chunk, score: vectorScore + keywordScore * 0.35, vectorScore, keywordScore }];
    })
    .filter(({ vectorScore, keywordScore }) => vectorScore >= 0.3 || keywordScore >= 0.5)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ chunk }) => chunk);
};

export { cosineSimilarity, searchRagChunks };
