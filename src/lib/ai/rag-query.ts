import { SEARCH_ALIASES, normalizeForSearch, tokensFor } from "@/lib/text/korean-tokenize";
import { matchedTokenRatio } from "@/lib/text/token-match";

const expandRagQuery = (query: string) => {
  const additions = SEARCH_ALIASES.flatMap(({ pattern, expansion }) =>
    pattern.test(query) ? [expansion] : [],
  );
  return additions.length ? `${query} ${[...new Set(additions)].join(" ")}` : query;
};

const keywordSimilarity = (query: string, document: string) =>
  matchedTokenRatio(tokensFor(query), normalizeForSearch(document));

/**
 * 청크 순회 전에 질문 쪽 토큰화를 한 번만 수행해두는 채점기.
 * 점수는 분류기 키워드 채점과 로컬 토큰화 채점 중 높은 쪽 —
 * 한쪽 목록이 빗나가도 다른 쪽이 받치고, 합산하지 않아 서로의 분모를 오염시키지 않는다.
 * 분류기 키워드도 로컬과 동일한 tokensFor 파이프라인(별칭 매핑·조사 스트립·불용어)을
 * 거친다 — "사진" 같은 일반어 인플레이션 방지 + "캐논"→canon 한영 별칭 일원화.
 */
const createKeywordScorer = (queryText: string, keywords: string[] = []) => {
  const localTokens = tokensFor(queryText);
  const keywordTokens = tokensFor(keywords.join(" "));
  return (document: string) => {
    const documentText = normalizeForSearch(document);
    return Math.max(
      matchedTokenRatio(keywordTokens, documentText),
      matchedTokenRatio(localTokens, documentText),
    );
  };
};

export { createKeywordScorer, expandRagQuery, keywordSimilarity };
