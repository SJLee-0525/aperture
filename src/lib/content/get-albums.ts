import { fetchPublishedAlbums, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_ALBUMS } from "@/mocks/albums";
import type { Album } from "@/types/album";

/** env 미설정·빈 컬렉션·오류 시 폴백 — published + order 정렬. */
const mockAlbums = (): Album[] =>
  MOCK_ALBUMS.filter((album) => album.published).sort((a, b) => a.order - b.order);

/**
 * 공개 앨범 목록 — published + order 정렬. ★ Firestore REST(원칙 #6), 실패·빈 컬렉션 시 mock 폴백.
 */
const getAlbums = async (): Promise<Album[]> => {
  if (!isFirebaseConfigured()) return mockAlbums();
  try {
    const albums = await fetchPublishedAlbums();
    return albums.length > 0 ? albums : mockAlbums();
  } catch (error) {
    console.warn("[content] getAlbums: Firestore REST 실패 — mock 폴백", error);
    return mockAlbums();
  }
};

export { getAlbums };
