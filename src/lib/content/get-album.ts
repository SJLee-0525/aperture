import { getAlbums } from "@/lib/content/get-albums";
import type { Album } from "@/types/album";

/**
 * 단일 앨범 (공개된 것만). 없으면 null.
 * getAlbums() 에서 파생 — 데이터 소스(REST↔mock)·폴백 정책을 한 곳에서만 관리한다.
 * 콘텐츠 소량이라 전체 fetch 후 find 로 충분(CLAUDE.md: 페이지네이션 없음).
 */
const getAlbum = async (id: string): Promise<Album | null> => {
  const albums = await getAlbums();
  return albums.find((album) => album.id === id) ?? null;
};

export { getAlbum };
