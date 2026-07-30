import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchPublishedPhotos } from "@/lib/firebase/firestore-rest";
import type { Photo } from "@/types/photo";

/** Firebase 미설정(로컬 dev·데모)에서만 쓰는 폴백 — published 필터 + order 정렬 완료 상태.
 *  mock 데이터는 이 시점에 동적 로드 — 실데이터 경로에서는 로드하지 않는다. */
const mockPhotos = async (): Promise<Photo[]> => {
  const { MOCK_PHOTOS } = await import("@/mocks/photos");
  return MOCK_PHOTOS.filter((photo) => photo.published).sort((a, b) => a.order - b.order);
};

/**
 * 공개 사진 목록 — published 필터 + order 정렬 완료 상태로 반환.
 * ★ 데이터 소스: Firestore REST(원칙 #6). Firebase 설정 시 항상 실데이터(빈 컬렉션이면 빈 배열).
 * mock 은 오직 env 미설정(로컬 dev·데모)일 때만 — 실데이터와 mock 이 섞이지 않게 한다.
 * 호출부(app/(public)/*)는 이 시그니처만 알면 됨 — 소스가 교체돼도 무변경.
 */
const getPhotos = async (): Promise<Photo[]> => {
  if (shouldUseMockContent()) return mockPhotos();
  return fetchPublishedPhotos();
};

export { getPhotos };
