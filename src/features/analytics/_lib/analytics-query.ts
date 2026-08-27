import { DETAIL_QUERY_KEYS } from "@/constants/routes";

/**
 * `page_location` 에 남겨도 되는 query 파라미터.
 *
 * 상세 모달을 여는 딥링크 id 뿐이다. 어떤 사진·연주·프로젝트를 열어 봤는지는 분석
 * 가치가 있으면서 방문자에 대해 알려 주는 것이 없다. 목록은 `DETAIL_QUERY_KEYS` 에서
 * 파생한다 — 따로 적으면 키가 늘어날 때 한쪽이 조용히 뒤처진다.
 *
 * 나머지는 버린다. 특히 검색어(`q`)는 방문자가 직접 쓴 문장이라 개인정보처리방침이 고지한
 * 수집 항목에 없다. 허용 목록으로 두는 이유는 파라미터가 새로 생겼을 때 기본이 "보내지 않음"
 * 이어야 하기 때문이다.
 */
const ANALYTICS_QUERY_ALLOWLIST: ReadonlySet<string> = new Set(Object.values(DETAIL_QUERY_KEYS));

/**
 * 분석에 보낼 query string 만 남긴다.
 *
 * @param search 현재 화면의 query. `URLSearchParams` 또는 직렬화된 문자열.
 * @returns `?` 없는 query 문자열. 남길 값이 없으면 빈 문자열.
 */
const analyticsQuery = (search: URLSearchParams | string): string => {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const kept = new URLSearchParams();
  // 원래 순서를 따라가므로 같은 화면이 항상 같은 문자열을 만든다.
  for (const [key, value] of params) {
    if (ANALYTICS_QUERY_ALLOWLIST.has(key)) kept.append(key, value);
  }
  return kept.toString();
};

export { analyticsQuery, ANALYTICS_QUERY_ALLOWLIST };
