"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { CONTACT_NAV, MEGA_MENU, type NavSection } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import styles from "./MobileMenu.module.css";

/**
 * 모바일 버거 메뉴 — 헤더 우측 버거 + 위에서 내려오는 시트(사진/음악/개발 아코디언 + 검색).
 * 데스크톱은 CSS로 버거 숨김(mega-menu 사용). 버거 + 오버레이를 한 컴포넌트로 캡슐화.
 */
const MobileMenu = () => {
  const { dict } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const currentSection = sectionFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<NavSection | null>(null);
  const [query, setQuery] = useState("");

  useScrollLock(open);

  const openMenu = () => {
    // 그룹(아코디언)이 있는 섹션만 펼친 채로 연다 — home·contact 는 그룹 없음.
    const group: NavSection | null =
      currentSection === "photo" || currentSection === "music" || currentSection === "dev"
        ? currentSection
        : null;
    setExpanded(group);
    setOpen(true);
  };
  const close = () => setOpen(false);

  // Escape 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `${ROUTES.SEARCH}?q=${encodeURIComponent(q)}` : ROUTES.SEARCH);
    close();
  };

  return (
    <>
      <button
        type="button"
        className={styles.burger}
        aria-label="Menu"
        aria-expanded={open}
        onClick={open ? close : openMenu}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open ? (
        <>
          <button type="button" className={styles.scrim} aria-label="Close menu" onClick={close} />
          <div className={styles.panel}>
            <form className={styles.search} onSubmit={submitSearch} role="search">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dict.searchPlaceholder}
                aria-label={dict.searchPlaceholder}
              />
              <button
                type="submit"
                className={styles.searchBtn}
                aria-label={dict.searchPlaceholder}
              >
                <Icon name="search" size={15} />
              </button>
            </form>

            {MEGA_MENU.map((group) => {
              const isOpen = expanded === group.section;
              return (
                <div
                  key={group.section}
                  className={`${styles.group} ${isOpen ? styles.groupOpen : ""}`}
                >
                  <button
                    type="button"
                    className={styles.groupBtn}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : group.section)}
                  >
                    <span className={styles.groupLabel}>{dict[group.labelKey]}</span>
                    <span className={styles.plus} aria-hidden="true">
                      +
                    </span>
                  </button>
                  <div className={styles.subs}>
                    {group.links.map((link) => (
                      <Link key={link.href} href={link.href} className={styles.sub} onClick={close}>
                        {dict[link.labelKey]}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            <Link href={CONTACT_NAV.href} className={styles.flatLink} onClick={close}>
              {dict[CONTACT_NAV.labelKey]}
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
};

export { MobileMenu };
