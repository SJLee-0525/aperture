import type { UIDict } from "@/constants/dictionary";
import { ROUTES } from "@/constants/routes";

/** 상단/하단 네비 항목 — 라벨은 사전 키(ko/en 자동), icon은 Icon name */
type NavItem = { labelKey: keyof UIDict; href: string; icon: string };

const NAV_ITEMS: NavItem[] = [
  { labelKey: "workNav", href: ROUTES.HOME, icon: "work" },
  { labelKey: "albumsNav", href: ROUTES.ALBUMS, icon: "album" },
  { labelKey: "mapNav", href: ROUTES.MAP, icon: "map" },
  { labelKey: "aboutNav", href: ROUTES.ABOUT, icon: "user" },
];

export { NAV_ITEMS };
export type { NavItem };
