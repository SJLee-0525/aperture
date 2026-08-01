"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { DesktopMegaMenu } from "@/features/site-header/_components/DesktopMegaMenu";
import { LangMenu } from "@/features/site-header/_components/LangMenu";
import { MobileMenu } from "@/features/site-header/_components/MobileMenu";
import { SearchBox } from "@/features/site-header/_components/SearchBox";
import { ThemeToggleButton } from "@/features/site-header/_components/ThemeToggleButton";

import styles from "./SiteHeader.module.css";

/**
 * 통합 상단 헤더. 데스크톱: 워드마크(Sungjoon Lee.) + mega-menu(사진/음악/개발 hover 드롭다운)
 * + 언어/테마 + 검색(사진 섹션 한정, 가장 우측). 모바일: 워드마크 + 언어/테마 (섹션 탭·버거 메뉴는 A2-2).
 * 아바타/유저 아이콘 없음(사용자 확정) — 관리자 진입은 /admin 직접.
 */
const SiteHeader = () => {
  const { dict } = useLang();

  return (
    <header className={styles.header} data-site-header>
      <div className={styles.inner}>
        <Link href={ROUTES.LANDING} className={styles.brand} aria-label={dict.homeLabel}>
          Sungjoon Lee<span className={styles.dot}>.</span>
        </Link>

        <DesktopMegaMenu />

        <span className={styles.spacer} />

        <div className={styles.controls}>
          <LangMenu />
          <ThemeToggleButton />
          <MobileMenu />
        </div>

        <SearchBox />
      </div>
    </header>
  );
};

export { SiteHeader };
