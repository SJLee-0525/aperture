import { unstable_cache } from "next/cache";

import { CHAT_PROFILE_CACHE_TAG } from "@/constants/cache";
import { DEFAULT_EMBEDDING_MODEL, generateEmbedding } from "@/lib/ai/embedding";
import { expandRagQuery, keywordSimilarity } from "@/lib/ai/rag-query";
import { fetchRagChunks } from "@/lib/firebase/public/rag";
import type { RagSection, StoredRagChunk } from "@/types/rag";

const cachedRagChunks = unstable_cache(fetchRagChunks, ["portfolio-rag-chunks-v1"], {
  revalidate: 3_600,
  tags: [CHAT_PROFILE_CACHE_TAG],
});

const cosineSimilarity = (a: number[], b: number[]) => {
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
): Promise<StoredRagChunk[]> => {
  const model = process.env.EMBEDDING_PROVIDER_MODEL?.trim() ?? DEFAULT_EMBEDDING_MODEL;
  const expandedQuery = expandRagQuery(query);
  const [queryVector, chunks] = await Promise.all([
    generateEmbedding(expandedQuery, { model, signal }),
    cachedRagChunks(),
  ]);
  const allowed = new Set(sections);
  return chunks
    .flatMap((chunk) => {
      if (!allowed.has(chunk.section) || chunk.embeddingModel !== model) return [];
      const vectorScore = cosineSimilarity(queryVector, chunk.embedding);
      const keywordScore = keywordSimilarity(query, chunk.text);
      return [{ chunk, score: vectorScore + keywordScore * 0.35, vectorScore, keywordScore }];
    })
    .filter(({ vectorScore, keywordScore }) => vectorScore >= 0.3 || keywordScore >= 0.5)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ chunk }) => chunk);
};

export { cosineSimilarity, searchRagChunks };
