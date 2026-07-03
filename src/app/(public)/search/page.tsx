import { Suspense } from "react";

import { SearchResults } from "@/features/search/SearchResults";
import { getAlbums } from "@/lib/content/get-albums";
import { getDevProjects } from "@/lib/content/get-dev-projects";
import { getMusicAwards } from "@/lib/content/get-music-awards";
import { getMusicMedia } from "@/lib/content/get-music-media";
import { getMusicWorks } from "@/lib/content/get-music-works";
import { getPhotos } from "@/lib/content/get-photos";

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

  return (
    <Suspense>
      <SearchResults
        photos={photos}
        albums={albums}
        works={works}
        awards={awards}
        media={media}
        projects={projects}
      />
    </Suspense>
  );
}
