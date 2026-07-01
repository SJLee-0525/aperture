import { MOCK_ALBUMS } from "@/mocks/albums";
import type { Album } from "@/types/album";

/** 공개 앨범 목록 — published + order 정렬. ★ P2에서 Firestore로 교체(호출부 무변경). */
const getAlbums = async (): Promise<Album[]> =>
  MOCK_ALBUMS.filter((album) => album.published).sort((a, b) => a.order - b.order);

export { getAlbums };
