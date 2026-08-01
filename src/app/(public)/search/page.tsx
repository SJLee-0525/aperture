import { Suspense } from "react";

import { SearchResults } from "@/features/search/_components/SearchResults";
import { createSearchDocuments } from "@/features/search/_lib/search-documents";
import { getDevProjects } from "@/lib/content/dev";
import { getMusicAwards, getMusicMedia, getMusicWorks } from "@/lib/content/music";
import { getAlbums, getPhotos } from "@/lib/content/photo";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = {
  ...pageMetadata({
    title: "검색",
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
  const [photos, albums, works, awards, media, projects] = await Promise.all([
    getPhotos(),
    getAlbums(),
    getMusicWorks(),
    getMusicAwards(),
    getMusicMedia(),
    getDevProjects(),
  ]);
  const documents = createSearchDocuments({ photos, albums, works, awards, media, projects });

  return (
    <Suspense>
      <SearchResults documents={documents} />
    </Suspense>
  );
}
