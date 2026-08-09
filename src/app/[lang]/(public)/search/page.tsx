import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchPageSkeleton } from "@/components/PublicPageSkeletons";
import { SearchResults } from "@/features/search/_components/SearchResults";
import { fetchSearchDocuments } from "@/features/search/_lib/fetch-search-documents";
import { pageMetadata } from "@/lib/seo/metadata";

import type { Lang } from "@/types/lang";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    ...pageMetadata({
      lang,
      title: { ko: "검색", en: "Search" },
      description: {
        ko: "이성준의 사진, 음악, 개발 작업을 검색합니다.",
        en: "Search the photography, music, and development work of Sungjoon Lee.",
      },
      pathname: "/search",
    }),
    robots: {
      index: false,
      follow: true,
    },
  };
}

/**
 * 통합 검색 (/search) — 사진·음악·개발 전 섹션. 전 섹션 published 데이터를 서버에서 모아
 * (ISR 캐시, q 무관) SearchResults 가 ?q 로 클라 필터. 검색어는 useSearchParams → Suspense 필요.
 *
 * @returns {Promise<JSX.Element>}
 */
export default async function SearchPage() {
  const documents = await fetchSearchDocuments();

  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchResults documents={documents} />
    </Suspense>
  );
}
