import type { UIDict } from "@/constants/dictionary";
import { ROUTES } from "@/constants/routes";

/** 상단/하단 네비 항목 — 라벨은 사전 키로 참조(ko/en 자동) */
type NavItem = { labelKey: keyof UIDict; href: string };

const NAV_ITEMS: NavItem[] = [
  { labelKey: "workNav", href: ROUTES.HOME },
  { labelKey: "albumsNav", href: ROUTES.ALBUMS },
  { labelKey: "mapNav", href: ROUTES.MAP },
  { labelKey: "aboutNav", href: ROUTES.ABOUT },
];

export { NAV_ITEMS };
export type { NavItem };
