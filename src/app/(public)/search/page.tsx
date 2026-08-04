import { Suspense } from "react";

import { SearchResults } from "@/features/search/_components/SearchResults";
import { fetchSearchDocuments } from "@/features/search/_lib/fetch-search-documents";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = {
  ...pageMetadata({
    title: "Search",
    description: "이성준의 사진, 음악, 개발 작업을 검색합니다.",
    pathname: "/search",
  }),
  robots: {
    index: false,
    follow: true,
  },
};

export const revalidate = 3600;

/**
 * 통합 검색 (/search) — 사진·음악·개발 전 섹션. 전 섹션 published 데이터를 서버에서 모아
 * (ISR 캐시, q 무관) SearchResults 가 ?q 로 클라 필터. 검색어는 useSearchParams → Suspense 필요.
 */
export default async function SearchPage() {
  const documents = await fetchSearchDocuments();

  return (
    <Suspense>
      <SearchResults documents={documents} />
    </Suspense>
  );
}
