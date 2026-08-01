"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { Icon } from "@/components/Icon";
import { CONTACT_NAV, MEGA_MENU, type NavSection } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { useLang } from "@/features/lang/_hooks/use-lang";
import {
  MOBILE_MENU_OPEN_ATTRIBUTE,
  MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE,
} from "@/features/site-header/_components/MobileNavigationVisibility";
import { useFocusTrap } from "@/hooks/use-focus-trap";
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
  const restoreHiddenChromeRef = useRef(false);
  const panelRef = useFocusTrap(open);

  useScrollLock(open);

  const openMenu = () => {
    // 그룹(아코디언)이 있는 섹션만 펼친 채로 연다 — home·contact 는 그룹 없음.
    const group: NavSection | null =
      currentSection === "photo" || currentSection === "music" || currentSection === "dev"
        ? currentSection
        : null;
    restoreHiddenChromeRef.current = document.documentElement.hasAttribute(
      MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE,
    );
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

  useEffect(() => () => document.documentElement.removeAttribute(MOBILE_MENU_OPEN_ATTRIBUTE), []);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (open) {
      root.removeAttribute(MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE);
      root.setAttribute(MOBILE_MENU_OPEN_ATTRIBUTE, "");
      return;
    }

    root.removeAttribute(MOBILE_MENU_OPEN_ATTRIBUTE);
    if (restoreHiddenChromeRef.current) {
      root.setAttribute(MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE, "");
    }
    restoreHiddenChromeRef.current = false;
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
        data-mobile-menu-trigger
        aria-label={open ? dict.menuCloseLabel : dict.menuOpenLabel}
        aria-expanded={open}
        onClick={open ? close : openMenu}
      >
        {open ? (
          <CloseIcon />
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.layer} data-mobile-menu-layer>
              <div className={styles.surface}>
                <div className={styles.headerSpace} aria-hidden="true" />
                <div
                  ref={panelRef}
                  className={styles.panel}
                  role="dialog"
                  aria-modal="true"
                  aria-label={dict.primaryNavLabel}
                  tabIndex={-1}
                >
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
                        <div className={styles.subs} aria-hidden={!isOpen}>
                          <div className={styles.subsInner}>
                            {group.links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                className={styles.sub}
                                onClick={close}
                                tabIndex={isOpen ? undefined : -1}
                              >
                                {dict[link.labelKey]}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Link href={CONTACT_NAV.href} className={styles.flatLink} onClick={close}>
                    {dict[CONTACT_NAV.labelKey]}
                  </Link>
                </div>
              </div>
              <button
                type="button"
                className={styles.scrim}
                aria-label={dict.menuCloseLabel}
                onClick={close}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export { MobileMenu };
