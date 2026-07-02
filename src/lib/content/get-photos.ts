import { fetchPublishedPhotos, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_PHOTOS } from "@/mocks/photos";
import type { Photo } from "@/types/photo";

/** env 미설정·빈 컬렉션·오류 시 폴백 — published 필터 + order 정렬 완료 상태. */
const mockPhotos = (): Photo[] =>
  MOCK_PHOTOS.filter((photo) => photo.published).sort((a, b) => a.order - b.order);

/**
 * 공개 사진 목록 — published 필터 + order 정렬 완료 상태로 반환.
 * ★ 데이터 소스: Firestore REST(원칙 #6). env 미설정·빈 컬렉션(전환기)·REST 오류 시 mock 폴백.
 * 호출부(app/(public)/*)는 이 시그니처만 알면 됨 — 소스가 교체돼도 무변경.
 */
const getPhotos = async (): Promise<Photo[]> => {
  if (!isFirebaseConfigured()) return mockPhotos();
  try {
    const photos = await fetchPublishedPhotos();
    return photos.length > 0 ? photos : mockPhotos();
  } catch (error) {
    console.warn("[content] getPhotos: Firestore REST 실패 — mock 폴백", error);
    return mockPhotos();
  }
};

export { getPhotos };
