import { createDocumentScorer } from "@/lib/search/score-documents";
import { tokensFor } from "@/lib/text/korean-tokenize";

import type { SearchDocument } from "@/types/search";

/**
 * 질의로 전 문서를 채점해 점수 내림차순으로 반환 — 임계 미달(0점)은 제외한다.
 * 동점은 입력 배열 순서(섹션 고정 순서 + 관리자 큐레이션)를 유지한다(stable sort).
 * 자동완성(suggest-documents)과 WebMCP `search_portfolio` 가 같은 랭킹을 공유한다.
 *
 * @param documents 대상 문서(섹션 필터는 호출부 책임).
 * @param query 정리(trim)된 질의.
 * @param [queryTokens] 이미 토큰화했다면 재사용.
 */
const rankDocuments = (
  documents: SearchDocument[],
  query: string,
  queryTokens: ReadonlySet<string> = tokensFor(query),
): SearchDocument[] => {
  const scoreDocument = createDocumentScorer(query, queryTokens);
  const scored: Array<{ score: number; document: SearchDocument }> = [];
  for (const document of documents) {
    const score = scoreDocument(document.index);
    if (score > 0) scored.push({ score, document });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.document);
};

export { rankDocuments };
