"use client";

import { useEffect, useMemo, useState } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import type { SearchDocument } from "@/types/search";
import { suggestDocuments } from "@/lib/search/suggest-documents";

let searchIndexPromise: Promise<SearchDocument[]> | null = null;

/**
 * 검색 인덱스는 앱 수명 동안 1회만 fetch(모듈 캐시) — 실패 시 캐시를 비워 다음 포커스에서 재시도.
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

/** 추천 갱신 디바운스 — 대조는 in-memory 라 비용 문제가 아니라, 타이핑 중 리스트가 매 타마다 바뀌는 시각 소음을 줄이는 용도. */
const SUGGEST_DEBOUNCE_MS = 120;

/**
 * 검색창 자동완성 상태 — loadIndex 를 포커스 시점에 호출하면 인덱스를 lazy load 한다
 * (검색 안 쓰는 방문자 비용 0). 입력은 짧은 디바운스 후 in-memory 대조로 추천을 갱신한다.
 * 데스크톱 SearchBox 와 모바일 버거 메뉴 검색이 공유한다.
 *
 * @param {string} query
 * @returns {{ suggestions: SearchSuggestion[]; loadIndex: () => void }}
 */
const useSearchSuggestions = (query: string) => {
  const { lang } = useLang();
  const [documents, setDocuments] = useState<SearchDocument[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // 빈 입력은 즉시 반영(렌더 파생) — 지운 검색창 밑에 직전 질의 추천이 잔상으로 남지 않게.
  const effectiveQuery = query.trim() ? debouncedQuery : query;

  const loadIndex = () => {
    void loadSearchIndex()
      .then(setDocuments)
      .catch(() => {}); // 실패 시 자동완성만 조용히 비활성 — 제출 검색(/search)은 그대로 동작
  };

  const suggestions = useMemo(
    () => suggestDocuments(documents, effectiveQuery, lang),
    [documents, effectiveQuery, lang],
  );

  return { suggestions, loadIndex };
};

export { useSearchSuggestions };
