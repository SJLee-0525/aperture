import type { Lang } from "@/types/lang";

/** UI 라벨 사전 — 콘텐츠가 아닌 정적 UI 문자열. 콘텐츠는 {ko,en} 필드 + pickText. */
type UIDict = {
  workNav: string;
  albumsNav: string;
  mapNav: string;
  aboutNav: string;
  searchPlaceholder: string;
  allTag: string;
  filterLabel: string;
  cameraLabel: string;
  focalLabel: string;
  resetLabel: string;
  emptyResults: string;
  viewMasonry: string;
  viewSquare: string;
};

const DICTIONARY: Record<Lang, UIDict> = {
  ko: {
    workNav: "작업",
    albumsNav: "앨범",
    mapNav: "지도",
    aboutNav: "소개",
    searchPlaceholder: "검색 · 태그 / 장비 / 장소",
    allTag: "전체",
    filterLabel: "필터",
    cameraLabel: "카메라",
    focalLabel: "초점거리",
    resetLabel: "초기화",
    emptyResults: "검색 결과가 없습니다",
    viewMasonry: "메이슨리",
    viewSquare: "정사각",
  },
  en: {
    workNav: "Work",
    albumsNav: "Albums",
    mapNav: "Map",
    aboutNav: "About",
    searchPlaceholder: "Search · tag / gear / place",
    allTag: "All",
    filterLabel: "Filter",
    cameraLabel: "Camera",
    focalLabel: "Focal length",
    resetLabel: "Reset",
    emptyResults: "No results found",
    viewMasonry: "Masonry",
    viewSquare: "Square",
  },
};

export { DICTIONARY };
export type { UIDict };
