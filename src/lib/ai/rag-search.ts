import { embeddingModelKey, generateEmbedding } from "@/lib/ai/embedding";
import { createKeywordScorer, expandRagQuery } from "@/lib/ai/rag-query";
import { matchRagChunks } from "@/lib/supabase/rag";

import type { RagPrioritize, RagQuery, RagSection, StoredRagChunkMeta } from "@/types/rag";

/**
 * 한 요청에서 모델에 넣는 청크 수.
 * 검색 비용은 후보 조회 RPC 1회로 상수라, 이 상한의 근거는 LLM 입력 토큰
 * 예산뿐이다(청크 최대 1,200자 × 10 = 12,000자 수준).
 */
const MAX_CHUNKS = 10;

/**
 * 방문자가 열어 둔 항목에서 먼저 채울 자리 수.
 * 전부를 차지하면 다른 문맥이 사라지고, 없으면 그 항목의 청크가 전체 상한 밖으로 밀린다.
 */
const PRIORITIZED_SLOTS = 3;

/**
 * 관련 청크를 찾는다. `prioritize` 를 주면 그 원본의 청크를 먼저 채운다.
 *
 * 벡터 유사도와 섹션·임베딩 모델 필터는 `match_rag_chunks` RPC 가 담당한다 —
 * 우선 대상 보강 후보에도 RPC 가 같은 필터를 적용하므로 여기서는 반복하지 않는다.
 * 키워드 점수는 RPC 가 돌려준 벡터 상위 후보 안에서만 계산한다. 벡터 순위 밖의
 * 키워드 단독 일치는 후보에 없다 (checklist 08 M6 기록).
 *
 * 분할은 상한을 자르기 전에 한다. 자른 뒤에 나누면 해당 글의 청크가 전체 상한 밖일 때
 * 우선순위가 아무 효과도 없다. `ignoreScoreFloor` 는 질문이 스스로 검색 대상을 고르지 못한
 * 지시어 질의("이 글 요약해 줘")에만 켠다. 그런 질의는 어떤 청크와도 유사도가 낮게 나오는데,
 * 방문자가 그 원본을 보고 있다는 사실이 관련성의 근거다. 질문이 대상을 직접 말한 경우에는
 * 열어 둔 원본도 같은 최소 점수를 넘어야 자리를 차지한다.
 *
 * @param {RagQuery} query 검색어와 키워드.
 * @param {RagSection[]} sections 검색할 섹션.
 * @param {AbortSignal} [signal] 요청 취소 신호.
 * @param {{ prioritize?: RagPrioritize }} [options] 우선 검색 대상.
 * @returns {Promise<StoredRagChunkMeta[]>} 우선 대상 최대 3개(점수 내림차순) 뒤에 하한을 통과한
 *   나머지 청크(점수 내림차순). 두 묶음을 합쳐 최대 10개이며 전체가 점수순은 아니다 —
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
  const queryVector = await generateEmbedding(expandedQuery, { signal });
  const prioritize = options?.prioritize;
  const candidates = await matchRagChunks({
    queryVector,
    sections,
    modelKey,
    ...(prioritize
      ? { prioritize: { sourceType: prioritize.sourceType, sourceId: prioritize.sourceId } }
      : {}),
    ...(signal ? { signal } : {}),
  });
  const scored = candidates.map(({ vectorScore, ...chunk }) => {
    const keywordScore = scoreKeywords(chunk.text);
    return { chunk, score: vectorScore + keywordScore * 0.35, vectorScore, keywordScore };
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
  const preferredIds = new Set(preferred.map(({ chunk }) => chunk.id));
  const rest = scored
    .filter((entry) => !preferredIds.has(entry.chunk.id) && passesFloor(entry))
    .toSorted(byScoreDesc);

  return [...preferred, ...rest].slice(0, MAX_CHUNKS).map(({ chunk }) => chunk);
};

export { searchRagChunks };
