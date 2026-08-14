"use client";

import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { MOBILE_TABS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { stripLangPrefix } from "@/lib/i18n/locale-path";

import styles from "./MobileTabBar.module.css";

/** 섹션 루트(/photo·/music·/dev)는 정확히 일치, 하위 경로는 prefix 매치(루트 탭이 하위에서도 켜지는 것 방지). */
const SECTION_ROOTS: string[] = [ROUTES.PHOTO, ROUTES.MUSIC, ROUTES.DEV];
const isTabActive = (href: string, pathname: string): boolean =>
  SECTION_ROOTS.includes(href) ? pathname === href : pathname.startsWith(href);

/**
 * 모바일 하단 탭바 — 현재 섹션(사진/음악/개발)의 탭 세트. 랜딩(home)에선 숨김. 데스크톱은 CSS로 숨김.
 *
 * @returns {JSX.Element | null}
 */
const MobileTabBar = () => {
  const { dict } = useLang();
  // 탭 href는 무-로케일 상수 — 활성 판정도 로케일을 벗긴 경로로 비교한다.
  const pathname = stripLangPrefix(usePathname());
  const section = sectionFromPath(pathname);

  // photo·music·dev 외 단일 페이지는 섹션 탭 세트가 없다.
  if (section !== "photo" && section !== "music" && section !== "dev") return null;

  return (
    <nav className={styles.tabbar} aria-label={dict.mobileNavigationLabel}>
      {MOBILE_TABS[section].map((tab) => (
        <LocalizedLink
          key={tab.href}
          href={tab.href}
          className={`${styles.tab} ${isTabActive(tab.href, pathname) ? styles.active : ""}`}
        >
          <Icon name={tab.icon} size={22} />
          <span>{dict[tab.labelKey]}</span>
        </LocalizedLink>
      ))}
    </nav>
  );
};

export { MobileTabBar };
