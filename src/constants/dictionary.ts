import type { Lang } from "@/types/lang";

/** UI 라벨 사전 — 콘텐츠가 아닌 정적 UI 문자열. 콘텐츠는 {ko,en} 필드 + pickText. */
type UIDict = {
  brandTagline: string;
  bootHello: string;
  themeToggle: string;
  workNav: string;
  albumsNav: string;
  mapNav: string;
  aboutNav: string;
  searchPlaceholder: string;
};

const DICTIONARY: Record<Lang, UIDict> = {
  ko: {
    brandTagline: "사진 포트폴리오",
    bootHello: "빛과 정적의 도시 풍경. 스캐폴드가 정상 부팅되었습니다.",
    themeToggle: "테마",
    workNav: "작업",
    albumsNav: "앨범",
    mapNav: "지도",
    aboutNav: "소개",
    searchPlaceholder: "검색 · 태그 / 장비 / 장소",
  },
  en: {
    brandTagline: "Photography",
    bootHello: "Quiet light, city frames. The scaffold booted successfully.",
    themeToggle: "Theme",
    workNav: "Work",
    albumsNav: "Albums",
    mapNav: "Map",
    aboutNav: "About",
    searchPlaceholder: "Search · tag / gear / place",
  },
};

export { DICTIONARY };
export type { UIDict };
