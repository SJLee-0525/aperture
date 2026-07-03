"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
import { MOBILE_TABS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { useLang } from "@/features/lang/use-lang";

import styles from "./MobileTabBar.module.css";

/** 섹션 루트(/photo·/music·/dev)는 정확히 일치, 하위 경로는 prefix 매치(루트 탭이 하위에서도 켜지는 것 방지). */
const SECTION_ROOTS: string[] = [ROUTES.PHOTO, ROUTES.MUSIC, ROUTES.DEV];
const isTabActive = (href: string, pathname: string): boolean =>
  SECTION_ROOTS.includes(href) ? pathname === href : pathname.startsWith(href);

/** 모바일 하단 탭바 — 현재 섹션(사진/음악/개발)의 탭 세트. 랜딩(home)에선 숨김. 데스크톱은 CSS로 숨김. */
const MobileTabBar = () => {
  const { dict } = useLang();
  const pathname = usePathname();
  const section = sectionFromPath(pathname);

  if (section === "home") return null;

  return (
    <nav className={styles.tabbar} aria-label="Mobile navigation">
      {MOBILE_TABS[section].map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`${styles.tab} ${isTabActive(tab.href, pathname) ? styles.active : ""}`}
        >
          <Icon name={tab.icon} size={22} />
          <span>{dict[tab.labelKey]}</span>
        </Link>
      ))}
    </nav>
  );
};

export { MobileTabBar };
