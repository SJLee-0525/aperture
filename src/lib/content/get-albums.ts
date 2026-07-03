import { fetchPublishedAlbums, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_ALBUMS } from "@/mocks/albums";
import type { Album } from "@/types/album";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published + order 정렬. */
const mockAlbums = (): Album[] =>
  MOCK_ALBUMS.filter((album) => album.published).sort((a, b) => a.order - b.order);

/**
 * 공개 앨범 목록 — published + order 정렬. ★ Firestore REST(원칙 #6).
 * Firebase 설정 시 항상 실데이터 — 빈 컬렉션이면 빈 배열을 그대로 반환한다.
 * (mock 으로 채우면 실사진과 mock 앨범의 photoIds 가 안 맞아 커버·상세가 깨진다.)
 * mock 은 오직 env 미설정일 때만. REST 오류 시엔 빈 배열(mock 오염 방지, 오류는 로그).
 */
const getAlbums = async (): Promise<Album[]> => {
  if (!isFirebaseConfigured()) return mockAlbums();
  try {
    return await fetchPublishedAlbums();
  } catch (error) {
    console.warn("[content] getAlbums: Firestore REST 실패 — 빈 목록", error);
    return [];
  }
};

export { getAlbums };
