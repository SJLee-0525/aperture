import type { Album } from "@/types/album";

/** P1 mock 앨범 — design/claude_design/portfolio.js 의 ALBUMS 이식. photoIds는 mocks/photos.ts id 참조. */
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
    // 커버로 쓸 공개 사진이 없는 앨범 — 상세 히어로의 plain variant(글자색 전환)를
    // mock 과 시각 기준선에서 확인하는 fixture 다. 사진을 지워 참조가 비는 실제 상황과 같다.
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
