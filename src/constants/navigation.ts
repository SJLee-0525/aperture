import type { UIDict } from "@/constants/dictionary";
import { ROUTES } from "@/constants/routes";
import type { SectionId } from "@/constants/sections";

/** 네비 항목 — 라벨은 사전 키(ko/en 자동), icon은 Icon name */
type NavItem = { labelKey: keyof UIDict; href: string; icon: string };

/** 섹션(사진·음악·개발) — home 제외 */
type NavSection = Exclude<SectionId, "home">;

/** 데스크톱 mega-menu 링크 — href는 라우트(사진) 또는 인-페이지 앵커(음악·개발) */
type MegaLink = { labelKey: keyof UIDict; href: string };
type MegaSection = {
  section: NavSection;
  labelKey: keyof UIDict; // 상위 버튼 라벨
  href: string; // 상위 버튼 클릭 시 이동
  links: MegaLink[]; // 드롭다운 패널
};

/** 데스크톱 상단 mega-menu 구조 (A2 SiteHeader 소비) */
const MEGA_MENU: MegaSection[] = [
  {
    section: "photo",
    labelKey: "sectionPhoto",
    href: ROUTES.PHOTO,
    links: [
      { labelKey: "workNav", href: ROUTES.PHOTO },
      { labelKey: "albumsNav", href: ROUTES.PHOTO_ALBUMS },
      { labelKey: "mapNav", href: ROUTES.PHOTO_MAP },
      { labelKey: "aboutNav", href: ROUTES.PHOTO_ABOUT },
    ],
  },
  {
    section: "music",
    labelKey: "sectionMusic",
    href: ROUTES.MUSIC,
    links: [
      { labelKey: "musicWorksNav", href: ROUTES.MUSIC },
      { labelKey: "musicScheduleNav", href: ROUTES.MUSIC_SCHEDULE },
      { labelKey: "musicAwardsNav", href: ROUTES.MUSIC_AWARDS },
      { labelKey: "musicMediaNav", href: ROUTES.MUSIC_MEDIA },
    ],
  },
  {
    section: "dev",
    labelKey: "sectionDev",
    href: ROUTES.DEV,
    links: [
      { labelKey: "devStackNav", href: ROUTES.DEV },
      { labelKey: "devProjectsNav", href: ROUTES.DEV_PROJECTS },
      { labelKey: "devCareerNav", href: ROUTES.DEV_CAREER },
    ],
  },
];

/** 모바일 섹션별 하단 탭 — 섹션에 따라 탭 세트가 다름 (A2 MobileTabBar 소비) */
const MOBILE_TABS: Record<NavSection, NavItem[]> = {
  photo: [
    { labelKey: "workNav", href: ROUTES.PHOTO, icon: "work" },
    { labelKey: "albumsNav", href: ROUTES.PHOTO_ALBUMS, icon: "album" },
    { labelKey: "mapNav", href: ROUTES.PHOTO_MAP, icon: "map" },
    { labelKey: "aboutNav", href: ROUTES.PHOTO_ABOUT, icon: "user" },
  ],
  music: [
    { labelKey: "musicWorksNav", href: ROUTES.MUSIC, icon: "music" },
    { labelKey: "musicScheduleNav", href: ROUTES.MUSIC_SCHEDULE, icon: "cal" },
    { labelKey: "musicAwardsNav", href: ROUTES.MUSIC_AWARDS, icon: "award" },
    { labelKey: "musicMediaNav", href: ROUTES.MUSIC_MEDIA, icon: "play" },
  ],
  dev: [
    { labelKey: "devStackNav", href: ROUTES.DEV, icon: "code" },
    { labelKey: "devProjectsNav", href: ROUTES.DEV_PROJECTS, icon: "folder" },
    { labelKey: "devCareerNav", href: ROUTES.DEV_CAREER, icon: "cal" },
  ],
};

export { MEGA_MENU, MOBILE_TABS };
export type { NavItem, NavSection, MegaLink, MegaSection };
