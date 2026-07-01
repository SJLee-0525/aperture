import { MOCK_PHOTOS } from "@/mocks/photos";
import type { Photo } from "@/types/photo";

/**
 * 공개 사진 목록 — published 필터 + order 정렬 완료 상태로 반환.
 * ★ 데이터 소스 교체 지점: P1은 mock, P2는 내부만 Firestore 호출로 교체(호출부 무변경).
 */
const getPhotos = async (): Promise<Photo[]> =>
  MOCK_PHOTOS.filter((photo) => photo.published).sort((a, b) => a.order - b.order);

export { getPhotos };
