"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
import { NAV_ITEMS } from "@/constants/navigation";
import { useLang } from "@/features/lang/use-lang";
import { isNavActive } from "@/features/site-header/is-nav-active";

import styles from "./MobileTabBar.module.css";

/** 모바일 하단 탭바 (작업/앨범/지도/소개). 데스크톱은 CSS로 숨김. */
const MobileTabBar = () => {
  const { dict } = useLang();
  const pathname = usePathname();

  return (
    <nav className={styles.tabbar} aria-label="Mobile navigation">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.tab} ${isNavActive(item.href, pathname) ? styles.active : ""}`}
        >
          <Icon name={item.icon} size={22} />
          <span>{dict[item.labelKey]}</span>
        </Link>
      ))}
    </nav>
  );
};

export { MobileTabBar };
