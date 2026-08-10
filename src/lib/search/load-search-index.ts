import type { SearchDocument } from "@/types/search";

let searchIndexPromise: Promise<SearchDocument[]> | null = null;

/**
 * 검색 인덱스는 앱 수명 동안 1회만 fetch(모듈 캐시) — 실패 시 캐시를 비워 다음 호출에서 재시도.
 * 헤더 검색 자동완성과 WebMCP `search_portfolio` 도구가 같은 캐시를 공유한다.
 *
 * @returns {Promise<SearchDocument[]>}
 */
const loadSearchIndex = (): Promise<SearchDocument[]> => {
  searchIndexPromise ??= fetch("/api/search-index")
    .then((response) => {
      if (!response.ok) throw new Error(`search-index ${response.status}`);
      return response.json() as Promise<SearchDocument[]>;
    })
    .catch((error: unknown) => {
      searchIndexPromise = null;
      throw error;
    });
  return searchIndexPromise;
};

export { loadSearchIndex };
