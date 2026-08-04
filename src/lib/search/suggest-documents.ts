import { pickText } from "@/lib/i18n/pick-text";
import type { TitleSegment } from "@/lib/search/highlight-title";
import { highlightTokensFor, splitTitleByMatches } from "@/lib/search/highlight-title";
import { createDocumentScorer } from "@/lib/search/score-documents";
import { tokensFor } from "@/lib/text/korean-tokenize";
import type { Lang } from "@/types/lang";
import type { SearchDocument, SearchSection } from "@/types/search";

type SearchSuggestion = {
  key: string;
  section: SearchSection;
  titleSegments: TitleSegment[];
  href: string;
};

/** 드롭다운에 보여줄 최대 추천 수 — 검색창 아래를 덮지 않는 선. */
const SUGGESTION_LIMIT = 5;

/**
 * 검색창 자동완성 — 결과 페이지(SearchResults)와 같은 채점기로 전 문서를 점수순 정렬해
 * 상위 N개만 추린다(섹션 무관 통합 랭킹). 대조가 전부 in-memory 라 입력마다 호출해도
 * 디바운스가 필요 없다. 동점은 문서 배열 순서(섹션 고정 순서 + 관리자 큐레이션) 유지.
 */
const suggestDocuments = (
  documents: SearchDocument[],
  query: string,
  lang: Lang,
): SearchSuggestion[] => {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const queryTokens = tokensFor(trimmed);
  const highlightTokens = highlightTokensFor(trimmed, queryTokens);
  const scoreDocument = createDocumentScorer(trimmed, queryTokens);

  const scored: Array<{ score: number; document: SearchDocument }> = [];
  for (const document of documents) {
    const score = scoreDocument(document.index);
    if (score > 0) scored.push({ score, document });
  }
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, SUGGESTION_LIMIT).map(({ document }) => ({
    key: document.key,
    section: document.section,
    titleSegments: splitTitleByMatches(pickText(document.title, lang), highlightTokens),
    href: document.href,
  }));
};

export { SUGGESTION_LIMIT, suggestDocuments };
export type { SearchSuggestion };
