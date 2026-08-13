import type { Album } from "@/types/album";

/** 디자인 샘플에서 가져온 mock 앨범. photoIds는 mocks/photos.ts의 ID를 참조한다. */
const MOCK_ALBUMS: Album[] = [
  {
    id: "city-night",
    title: { ko: "도시의 밤", en: "City Nights" },
    subtitle: { ko: "2026 · 도쿄·서울", en: "2026 · Tokyo·Seoul" },
    coverPhotoId: "p05",
    photoIds: ["p01", "p05", "p08", "p10"],
    order: 0,
    published: true,
  },
  {
    id: "coastline",
    title: { ko: "해안선", en: "Coastline" },
    subtitle: { ko: "2025–26 · 제주·강릉", en: "2025–26 · Jeju·Gangneung" },
    coverPhotoId: "p12",
    photoIds: ["p04", "p07", "p09", "p12"],
    order: 1,
    published: true,
  },
  {
    id: "stillness",
    title: { ko: "고요", en: "Stillness" },
    subtitle: { ko: "2026 · 풍경", en: "2026 · Landscape" },
    coverPhotoId: "p03",
    photoIds: ["p03", "p06", "p11"],
    order: 2,
    published: true,
  },
  {
    id: "street",
    title: { ko: "스트리트", en: "Street" },
    subtitle: { ko: "2026 · 거리", en: "2026 · Street" },
    coverPhotoId: "p02",
    photoIds: ["p02"],
    order: 3,
    published: true,
  },
  {
    // 공개 커버가 없는 상세 화면을 mock과 시각 기준선에서 확인한다.
    id: "unreleased",
    title: { ko: "미공개 모음", en: "Unreleased" },
    subtitle: { ko: "2026 · 준비 중", en: "2026 · In progress" },
    coverPhotoId: "p90",
    photoIds: ["p90"],
    order: 4,
    published: true,
  },
];

export { MOCK_ALBUMS };
