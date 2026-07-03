"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
import { MOBILE_TABS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { useLang } from "@/features/lang/use-lang";

import styles from "./MobileTabBar.module.css";

/** 인-페이지 앵커(#) 탭은 활성 표시 안 함(스크롤 스파이는 B·C). 사진 루트(/photo)는 정확히 일치. */
const isTabActive = (href: string, pathname: string): boolean => {
  if (href.includes("#")) return false;
  return href === ROUTES.PHOTO ? pathname === ROUTES.PHOTO : pathname.startsWith(href);
};

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
