import type { UIDict } from "@/constants/dictionary";
import { ROUTES } from "@/constants/routes";
import type { SectionId } from "@/constants/sections";

/** 네비 항목 — 라벨은 사전 키(ko/en 자동), icon은 Icon name */
type NavItem = { labelKey: keyof UIDict; href: string; icon: string };

/** 섹션 탭 세트를 갖는 섹션(사진·음악·개발) */
type NavSection = Extract<SectionId, "photo" | "music" | "dev">;

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
    section: "dev",
    labelKey: "sectionDev",
    href: ROUTES.DEV,
    links: [
      { labelKey: "aboutNav", href: ROUTES.DEV_ABOUT },
      { labelKey: "devCareerNav", href: ROUTES.DEV_CAREER },
      { labelKey: "devStackNav", href: ROUTES.DEV },
      { labelKey: "devProjectsNav", href: ROUTES.DEV_PROJECTS },
    ],
  },
  {
    section: "photo",
    labelKey: "sectionPhoto",
    href: ROUTES.PHOTO,
    links: [
      { labelKey: "aboutNav", href: ROUTES.PHOTO_ABOUT },
      { labelKey: "workNav", href: ROUTES.PHOTO },
      { labelKey: "albumsNav", href: ROUTES.PHOTO_ALBUMS },
      { labelKey: "mapNav", href: ROUTES.PHOTO_MAP },
    ],
  },
  {
    section: "music",
    labelKey: "sectionMusic",
    href: ROUTES.MUSIC,
    links: [
      { labelKey: "aboutNav", href: ROUTES.MUSIC_ABOUT },
      { labelKey: "musicCareerNav", href: ROUTES.MUSIC_CAREER },
      { labelKey: "musicWorksNav", href: ROUTES.MUSIC },
      { labelKey: "musicMediaNav", href: ROUTES.MUSIC_MEDIA },
    ],
  },
];

/**
 * 연락처 — 섹션이 아닌 전역 단일 페이지라 mega-menu 그룹이 아니라 최상위 평면 링크로 노출.
 * 사진/음악/개발 그룹 뒤에 이어서 렌더(데스크톱 mega, 모바일 버거 시트 공용).
 */
const CONTACT_NAV: MegaLink = { labelKey: "contactNav", href: ROUTES.CONTACT };

/** 모바일 섹션별 하단 탭 — 섹션에 따라 탭 세트가 다름 (A2 MobileTabBar 소비) */
const MOBILE_TABS: Record<NavSection, NavItem[]> = {
  dev: [
    { labelKey: "aboutNav", href: ROUTES.DEV_ABOUT, icon: "user" },
    { labelKey: "devCareerNav", href: ROUTES.DEV_CAREER, icon: "cal" },
    { labelKey: "devStackNav", href: ROUTES.DEV, icon: "code" },
    { labelKey: "devProjectsNav", href: ROUTES.DEV_PROJECTS, icon: "folder" },
  ],
  photo: [
    { labelKey: "aboutNav", href: ROUTES.PHOTO_ABOUT, icon: "user" },
    { labelKey: "workNav", href: ROUTES.PHOTO, icon: "work" },
    { labelKey: "albumsNav", href: ROUTES.PHOTO_ALBUMS, icon: "album" },
    { labelKey: "mapNav", href: ROUTES.PHOTO_MAP, icon: "map" },
  ],
  music: [
    { labelKey: "aboutNav", href: ROUTES.MUSIC_ABOUT, icon: "user" },
    { labelKey: "musicCareerNav", href: ROUTES.MUSIC_CAREER, icon: "award" },
    { labelKey: "musicWorksNav", href: ROUTES.MUSIC, icon: "music" },
    { labelKey: "musicMediaNav", href: ROUTES.MUSIC_MEDIA, icon: "play" },
  ],
};

export { MEGA_MENU, CONTACT_NAV, MOBILE_TABS };
export type { NavSection };
