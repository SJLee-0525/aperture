import { getDevProjects } from "@/lib/content/dev";
import { getMusicAwards, getMusicMedia, getMusicWorks } from "@/lib/content/music";
import { getAlbums, getPhotos } from "@/lib/content/photo";

import type { SearchDocument } from "@/types/search";

import { createSearchDocuments } from "./search-documents";

/** 전 섹션 published 콘텐츠를 모아 검색 문서로 투영 — /search 페이지와 /api/search-index 가 공유. */
const fetchSearchDocuments = async (): Promise<SearchDocument[]> => {
  const [photos, albums, works, awards, media, projects] = await Promise.all([
    getPhotos(),
    getAlbums(),
    getMusicWorks(),
    getMusicAwards(),
    getMusicMedia(),
    getDevProjects(),
  ]);
  return createSearchDocuments({ photos, albums, works, awards, media, projects });
};

export { fetchSearchDocuments };
