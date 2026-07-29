"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CONTACT_NAV, MEGA_MENU } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { useLang } from "@/features/lang/_hooks/use-lang";
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
  const pathname = usePathname();
  const section = sectionFromPath(pathname);

  // 드롭다운 열림 = JS 상태. hovered(hover/포커스로 임시 열림) + pinned(클릭 고정). shown = 실제 표시 섹션.
  // 고정 시 다른 섹션 hover 억제(pinned 우선), 하위 링크 클릭 시 둘 다 비워 라우트 이동 후에도 닫히게 한다.
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const shown = pinned ?? hovered;
  const navRef = useRef<HTMLElement>(null);

  const closeMenu = () => {
    setPinned(null);
    setHovered(null);
  };

  // 고정 상태에서만 바깥 클릭·Esc 로 해제.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setPinned(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
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
        <Link href={ROUTES.LANDING} className={styles.brand} aria-label={dict.homeLabel}>
          Sungjoon Lee<span className={styles.dot}>.</span>
        </Link>

        <nav ref={navRef} className={styles.mega} aria-label={dict.primaryNavLabel}>
          {MEGA_MENU.map((group) => (
            <div
              key={group.section}
              data-section={group.section}
              className={`${styles.megaItem} ${section === group.section ? styles.current : ""} ${
                shown === group.section ? styles.open : ""
              }`}
              onMouseEnter={() => setHovered(group.section)}
              onMouseLeave={() => setHovered((h) => (h === group.section ? null : h))}
              onFocus={() => setHovered(group.section)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setHovered((h) => (h === group.section ? null : h));
                }
              }}
            >
              <button
                type="button"
                className={styles.megaBtn}
                aria-expanded={shown === group.section}
                onClick={() => setPinned((prev) => (prev === group.section ? null : group.section))}
              >
                {dict[group.labelKey]}
              </button>
              <div className={styles.megaPanel}>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={styles.megaLink}
                    onClick={closeMenu}
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
            <Link href={CONTACT_NAV.href} className={styles.megaBtn} onClick={closeMenu}>
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
