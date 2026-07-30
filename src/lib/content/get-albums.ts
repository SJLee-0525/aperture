import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchPublishedAlbums } from "@/lib/firebase/firestore-rest";
import type { Album } from "@/types/album";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published + order 정렬.
 *  mock 데이터는 이 시점에 동적 로드 — 실데이터 경로에서는 로드하지 않는다. */
const mockAlbums = async (): Promise<Album[]> => {
  const { MOCK_ALBUMS } = await import("@/mocks/albums");
  return MOCK_ALBUMS.filter((album) => album.published).sort((a, b) => a.order - b.order);
};

/**
 * 공개 앨범 목록 — published + order 정렬. ★ Firestore REST(원칙 #6).
 * Firebase 설정 시 항상 실데이터 — 빈 컬렉션이면 빈 배열을 그대로 반환한다.
 * (mock 으로 채우면 실사진과 mock 앨범의 photoIds 가 안 맞아 커버·상세가 깨진다.)
 * mock 은 오직 개발·명시적 mock 모드에서만 사용한다. REST 오류는 throw해 ISR의
 * 마지막 성공 결과가 빈 목록으로 덮이지 않게 한다.
 */
const getAlbums = async (): Promise<Album[]> => {
  if (shouldUseMockContent()) return mockAlbums();
  return fetchPublishedAlbums();
};

export { getAlbums };
