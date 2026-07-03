"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CONTACT_NAV, MEGA_MENU } from "@/constants/navigation";
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

  // 클릭으로 고정(pin)한 섹션. null = 미고정 → 자유 hover. 라우트(.current)와 무관한 상호작용 상태.
  const [pinned, setPinned] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // 고정 상태에서만 바깥 클릭·Esc 로 해제.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setPinned(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinned]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={ROUTES.LANDING} className={styles.brand} aria-label="Sungjoon Lee home">
          Sungjoon Lee<span className={styles.dot}>.</span>
        </Link>

        <nav
          ref={navRef}
          className={styles.mega}
          aria-label="Primary"
          data-pinned={pinned ?? undefined}
        >
          {MEGA_MENU.map((group) => (
            <div
              key={group.section}
              data-section={group.section}
              className={`${styles.megaItem} ${section === group.section ? styles.current : ""} ${
                pinned === group.section ? styles.pinned : ""
              }`}
            >
              <button
                type="button"
                className={styles.megaBtn}
                aria-haspopup="menu"
                aria-expanded={pinned === group.section}
                onClick={() => setPinned((prev) => (prev === group.section ? null : group.section))}
              >
                {dict[group.labelKey]}
              </button>
              <div className={styles.megaPanel} role="menu">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={styles.megaLink}
                    role="menuitem"
                    onClick={() => setPinned(null)}
                  >
                    {dict[link.labelKey]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div
            data-section="contact"
            className={`${styles.megaItem} ${
              pathname.startsWith(ROUTES.CONTACT) ? styles.current : ""
            }`}
          >
            <Link
              href={CONTACT_NAV.href}
              className={styles.megaBtn}
              onClick={() => setPinned(null)}
            >
              {dict[CONTACT_NAV.labelKey]}
            </Link>
          </div>
        </nav>

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
