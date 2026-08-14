import { embeddingModelKey, generateEmbedding } from "@/lib/ai/embedding";
import { getRagIndex } from "@/lib/ai/rag-index";
import { createKeywordScorer, expandRagQuery } from "@/lib/ai/rag-query";

import type { RagPrioritize, RagQuery, RagSection, StoredRagChunkMeta } from "@/types/rag";

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

/** 한 요청에서 모델에 넣는 청크 수. */
const MAX_CHUNKS = 8;

/**
 * 방문자가 열어 둔 항목에서 먼저 채울 자리 수.
 * 전부를 차지하면 다른 문맥이 사라지고, 없으면 그 항목의 청크가 전체 상위 8개 밖으로 밀린다.
 */
const PRIORITIZED_SLOTS = 3;

/**
 * 관련 청크를 찾는다. `prioritize` 를 주면 그 원본의 청크를 먼저 채운다.
 *
 * 분할은 상위 8개를 자르기 전에 한다. 자른 뒤에 나누면 해당 글의 청크가 전체 상위 8개 밖일 때
 * 우선순위가 아무 효과도 없다. `ignoreScoreFloor` 는 질문이 스스로 검색 대상을 고르지 못한
 * 지시어 질의("이 글 요약해 줘")에만 켠다. 그런 질의는 어떤 청크와도 유사도가 낮게 나오는데,
 * 방문자가 그 원본을 보고 있다는 사실이 관련성의 근거다. 질문이 대상을 직접 말한 경우에는
 * 열어 둔 원본도 같은 최소 점수를 넘어야 자리를 차지한다.
 *
 * 임베딩 모델 불일치 제외는 우선 대상에도 적용한다.
 *
 * @param {RagQuery} query 검색어와 키워드.
 * @param {RagSection[]} sections 검색할 섹션.
 * @param {AbortSignal} [signal] 요청 취소 신호.
 * @param {{ prioritize?: RagPrioritize }} [options] 우선 검색 대상.
 * @returns {Promise<StoredRagChunkMeta[]>} 우선 대상 최대 3개(점수 내림차순) 뒤에 하한을 통과한
 *   나머지 청크(점수 내림차순). 두 묶음을 합쳐 최대 8개이며 전체가 점수순은 아니다 —
 *   `ignoreScoreFloor` 에서는 우선 대상이 더 높은 점수의 청크보다 앞에 온다.
 */
const searchRagChunks = async (
  query: RagQuery,
  sections: RagSection[],
  signal?: AbortSignal,
  options?: { prioritize?: RagPrioritize },
): Promise<StoredRagChunkMeta[]> => {
  const modelKey = embeddingModelKey();
  const expandedQuery = expandRagQuery(query.text);
  const scoreKeywords = createKeywordScorer(query.text, query.keywords);
  const [queryVector, index] = await Promise.all([
    generateEmbedding(expandedQuery, { signal }),
    getRagIndex(),
  ]);
  const allowed = new Set(sections);
  const prioritize = options?.prioritize;
  const scored = index.flatMap(({ chunk, vector }) => {
    if (!allowed.has(chunk.section) || chunk.embeddingModel !== modelKey) return [];
    const vectorScore = cosineSimilarity(queryVector, vector);
    const keywordScore = scoreKeywords(chunk.text);
    return [{ chunk, score: vectorScore + keywordScore * 0.35, vectorScore, keywordScore }];
  });

  const byScoreDesc = (a: (typeof scored)[number], b: (typeof scored)[number]) => b.score - a.score;
  const isPrioritized = ({ chunk }: (typeof scored)[number]) =>
    Boolean(
      prioritize &&
      chunk.sourceType === prioritize.sourceType &&
      chunk.sourceId === prioritize.sourceId,
    );
  const passesFloor = ({ vectorScore, keywordScore }: (typeof scored)[number]) =>
    vectorScore >= 0.3 || keywordScore >= 0.5;

  const preferred = prioritize
    ? scored
        .filter(
          (entry) => isPrioritized(entry) && (prioritize.ignoreScoreFloor || passesFloor(entry)),
        )
        .toSorted(byScoreDesc)
        .slice(0, PRIORITIZED_SLOTS)
    : [];
  // 정렬은 상한을 통과한 청크에만 든다. 색인 전체를 정렬하면 8개를 고르는 비용이 색인 크기를 따라간다.
  const preferredIds = new Set(preferred.map(({ chunk }) => chunk.id));
  const rest = scored
    .filter((entry) => !preferredIds.has(entry.chunk.id) && passesFloor(entry))
    .toSorted(byScoreDesc);

  return [...preferred, ...rest].slice(0, MAX_CHUNKS).map(({ chunk }) => chunk);
};

export { cosineSimilarity, searchRagChunks };
