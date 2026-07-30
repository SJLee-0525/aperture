import type { GalleryPhoto } from "@/types/gallery-photo";

/** 태그 필터의 "전체" 센티넬 (특정 태그 id와 겹치지 않는 값) */
const ALL = "__all__";
/** 초점거리 슬라이더 범위 (mm) */
const FOCAL_MIN = 16;
const FOCAL_MAX = 300;

type FilterState = {
  tag: string;
  query: string;
  camera: string;
  focalMin: number;
  focalMax: number;
};

/** "35 mm" → 35, 알 수 없는 값 → null */
const parseFocal = (focalLength: string): number | null => {
  const parsed = parseInt(focalLength, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/** 순수 필터 — 태그·카메라·초점거리·텍스트. 정렬은 getter에서 이미 완료(order). */
const filterPhotos = (photos: GalleryPhoto[], f: FilterState): GalleryPhoto[] => {
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
      const hay = [
        photo.title.ko,
        photo.title.en,
        photo.camera,
        photo.lens,
        photo.place.ko,
        photo.place.en,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
};

export { filterPhotos, ALL, FOCAL_MIN, FOCAL_MAX };
