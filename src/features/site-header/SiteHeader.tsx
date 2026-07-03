"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MEGA_MENU } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { useLang } from "@/features/lang/use-lang";
import { LangMenu } from "@/features/site-header/LangMenu";
import { MobileMenu } from "@/features/site-header/MobileMenu";
import { SearchBox } from "@/features/site-header/SearchBox";
import { ThemeToggleButton } from "@/features/site-header/ThemeToggleButton";

import styles from "./SiteHeader.module.css";

/**
 * 통합 상단 헤더. 데스크톱: 워드마크(Sungjoon Lee.) + mega-menu(사진/음악/개발 hover 드롭다운)
 * + 언어/테마 + 검색(사진 섹션 한정, 가장 우측). 모바일: 워드마크 + 언어/테마 (섹션 탭·버거 메뉴는 A2-2).
 * 아바타/유저 아이콘 없음(사용자 확정) — 관리자 진입은 /admin 직접.
 */
const SiteHeader = () => {
  const { dict } = useLang();
  const pathname = usePathname();
  const section = sectionFromPath(pathname);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={ROUTES.LANDING} className={styles.brand} aria-label="Sungjoon Lee home">
          Sungjoon Lee<span className={styles.dot}>.</span>
        </Link>

        <nav className={styles.mega} aria-label="Primary">
          {MEGA_MENU.map((group) => (
            <div
              key={group.section}
              className={`${styles.megaItem} ${section === group.section ? styles.current : ""}`}
            >
              <Link href={group.href} className={styles.megaBtn}>
                {dict[group.labelKey]}
              </Link>
              <div className={styles.megaPanel} role="menu">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={styles.megaLink}
                    role="menuitem"
                  >
                    {dict[link.labelKey]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <span className={styles.spacer} />

        <div className={styles.controls}>
          <LangMenu />
          <ThemeToggleButton />
          <MobileMenu />
        </div>

        {section === "photo" ? <SearchBox /> : null}
      </div>
    </header>
  );
};

export { SiteHeader };
