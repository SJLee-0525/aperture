import { ALL, FOCAL_MAX, FOCAL_MIN } from "@/lib/photo/filter-query";

import type { GalleryPhoto } from "@/types/gallery-photo";

type FilterState = {
  tag: string;
  query: string;
  camera: string;
  focalMin: number;
  focalMax: number;
};

/**
 * "35 mm" → 35, 알 수 없는 값 → null
 */
const parseFocal = (focalLength: string): number | null => {
  const parsed = parseInt(focalLength, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * 사진 한 장의 텍스트 검색 haystack
 */
const haystackOf = (photo: GalleryPhoto): string =>
  [photo.title.ko, photo.title.en, photo.camera, photo.lens, photo.place.ko, photo.place.en]
    .join(" ")
    .toLowerCase();

/**
 * 검색 haystack 사전 계산 — 사진 목록이 바뀔 때 한 번만 만들고 키스트로크마다 재조합하지 않는다.
 */
const buildSearchIndex = (photos: GalleryPhoto[]): Map<string, string> =>
  new Map(photos.map((photo) => [photo.id, haystackOf(photo)]));

/**
 * 순수 필터 — 태그·카메라·초점거리·텍스트. 정렬은 getter에서 이미 완료(order).
 */
const filterPhotos = (
  photos: GalleryPhoto[],
  f: FilterState,
  searchIndex?: Map<string, string>,
): GalleryPhoto[] => {
  const query = f.query.trim().toLowerCase();
  const focalFilterActive = f.focalMin > FOCAL_MIN || f.focalMax < FOCAL_MAX;
  return photos.filter((photo) => {
    if (f.tag !== ALL && !photo.tags.includes(f.tag)) return false;
    if (f.camera !== ALL && photo.camera !== f.camera) return false;
    if (focalFilterActive) {
      const focal = parseFocal(photo.exif.focalLength);
      if (focal == null || focal < f.focalMin || focal > f.focalMax) return false;
    }
    if (query) {
      const hay = searchIndex?.get(photo.id) ?? haystackOf(photo);
      if (!hay.includes(query)) return false;
    }
    return true;
  });
};

export { ALL, buildSearchIndex, filterPhotos };
