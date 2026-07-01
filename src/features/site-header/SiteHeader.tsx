"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";
import { LangMenu } from "@/features/site-header/LangMenu";
import { SearchBox } from "@/features/site-header/SearchBox";
import { ThemeToggleButton } from "@/features/site-header/ThemeToggleButton";
import { isNavActive } from "@/features/site-header/is-nav-active";

import styles from "./SiteHeader.module.css";

/**
 * 공개 페이지 상단 헤더. 데스크톱: 워드마크 + 네비 + 검색 + 언어/테마.
 * 모바일: 워드마크 + 언어/테마 (네비는 하단 탭바로, 검색은 갤러리 뷰로).
 */
const SiteHeader = () => {
  const { dict } = useLang();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={ROUTES.HOME} className={styles.brand} aria-label="Aperture home">
          Aperture<span className={styles.dot}>.</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${
                isNavActive(item.href, pathname) ? styles.navLinkActive : ""
              }`}
            >
              {dict[item.labelKey]}
            </Link>
          ))}
        </nav>

        <span className={styles.spacer} />

        <SearchBox />

        <div className={styles.controls}>
          <LangMenu />
          <ThemeToggleButton />
          <span className={styles.avatar} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};

export { SiteHeader };
