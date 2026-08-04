import { tokensFor } from "@/lib/text/korean-tokenize";
import { matchedTokenRatio } from "@/lib/text/token-match";

/** 서버(search-documents)가 미리 정규화해 내려주는 대조용 인덱스 — 클라는 재정규화 없이 대조만. */
type SearchIndex = {
  /** 제목(ko+en) 정규화본 — 랭킹 가중 대상 */
  title: string;
  /** 나머지 텍스트(장소·프로그램·태그 등) 정규화본 */
  body: string;
  /** 한글 초성 나열(공백 제거) — 초성 전용 질의("ㅂㅅ")의 대조 대상 */
  choseong: string;
};

// 제목 매치는 본문 매치보다 강한 신호 — "피아노" 검색에서 제목이 "피아노 소나타"인
// 문서가 program 배열에만 피아노가 있는 문서를 이긴다.
const TITLE_WEIGHT = 2.5;
// 기존 matchesSearchText 임계값 계승 — 질의 토큰 절반 이상이 문서에 있어야 결과로 친다.
const MATCH_THRESHOLD = 0.5;
// 초성 일치는 항상 최하위 신호 — 초성 전용 질의끼리는 전부 동점이라 큐레이션 순서가 유지된다.
const CHOSEONG_WEIGHT = 0.2;

/** 질의 전체(공백 제외)가 초성 자모 2자 이상일 때만 초성 검색으로 본다 — 1자는 사실상
 *  전 문서와 일치해 판별력이 없다(일반 토큰 검색도 2자 미만은 버린다). 혼합 질의는 일반 토큰 검색. */
const choseongQueryFor = (query: string): string | null => {
  const compact = query.replace(/\s+/g, "");
  return /^[ㄱ-ㅎ]{2,}$/.test(compact) ? compact : null;
};

/**
 * 통합 검색 랭킹 채점기. 질의 토큰화는 클로저에서 한 번만 하고 문서 순회는 대조만.
 * 0 = 불일치(결과 제외), 양수 = 랭킹 점수(제목 가중 + 전체 일치율). 동점은 문서 배열
 * 순서(관리자 order 큐레이션)가 tiebreak — 정렬 안정성으로 자연 보존된다.
 * queryTokens는 호출부가 이미 토큰화해뒀으면 재사용(하이라이트와 공유) — 없으면 여기서 생성.
 */
const createDocumentScorer = (
  query: string,
  queryTokens: ReadonlySet<string> = tokensFor(query),
) => {
  const choseongQuery = choseongQueryFor(query);
  return (index: SearchIndex): number => {
    if (choseongQuery) return index.choseong.includes(choseongQuery) ? CHOSEONG_WEIGHT : 0;
    const matchRatio = matchedTokenRatio(queryTokens, `${index.title} ${index.body}`);
    if (matchRatio < MATCH_THRESHOLD) return 0;
    return matchRatio + TITLE_WEIGHT * matchedTokenRatio(queryTokens, index.title);
  };
};

export { createDocumentScorer };
export type { SearchIndex };
