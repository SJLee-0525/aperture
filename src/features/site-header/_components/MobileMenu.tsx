"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { Icon } from "@/components/Icon";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { LangMenu } from "@/features/site-header/_components/LangMenu";
import {
  MOBILE_MENU_OPEN_ATTRIBUTE,
  MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE,
} from "@/features/site-header/_components/MobileNavigationVisibility";
import { ThemeToggleButton } from "@/features/site-header/_components/ThemeToggleButton";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import { MOBILE_NAVIGATION_QUERY } from "@/constants/breakpoints";
import { CONTACT_NAV, MEGA_MENU, type NavSection } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { localizePath } from "@/lib/i18n/locale-path";

import styles from "./MobileMenu.module.css";

/**
 * 모바일 버거 메뉴 — 헤더 우측 버거 + 위에서 내려오는 시트(사진/음악/개발 아코디언 + 검색).
 * 데스크톱은 CSS로 버거 숨김(mega-menu 사용). 버거 + 오버레이를 한 컴포넌트로 캡슐화.
 * 검색은 제출로 /search 만 연다 — 자동완성 드롭다운은 데스크톱(SearchBox) 전용.
 */


const MobileMenu = () => {
  const { dict, lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const currentSection = sectionFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<NavSection | null>(null);
  const [query, setQuery] = useState("");
  const restoreHiddenChromeRef = useRef(false);
  const panelRef = useFocusTrap(open);

  // body fixed·root overflow 잠금은 둘 다 sticky 헤더를 문서 최상단(-scrollY)으로 밀어낸다.
  // 메뉴는 헤더(로고·토글)가 시트 위에 계속 보여야 하므로 body overflow 승격 잠금만 사용한다.
  useScrollLock(open, { fixBodyOnMobile: false, lockRootOnMobile: false });

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

  useEscapeKey(open, close);

  // 데스크톱 폭으로 전환되면 자동으로 닫는다 — 데스크톱은 mega-menu 가 담당하고
  // 버거가 CSS 로 숨겨져 시트를 닫을 수단이 없어진다(스크롤 잠금도 걸린 채 남는다).
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia(MOBILE_NAVIGATION_QUERY);
    const onChange = () => {
      if (!media.matches) setOpen(false);
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
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
    router.push(
      localizePath(lang, q ? `${ROUTES.SEARCH}?q=${encodeURIComponent(q)}` : ROUTES.SEARCH),
    );
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
                      <Icon name="search" size={17} />
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
                              <LocalizedLink
                                key={link.href}
                                href={link.href}
                                className={styles.sub}
                                onClick={close}
                                tabIndex={isOpen ? undefined : -1}
                              >
                                {dict[link.labelKey]}
                              </LocalizedLink>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <LocalizedLink
                    href={CONTACT_NAV.href}
                    className={styles.flatLink}
                    onClick={close}
                  >
                    {dict[CONTACT_NAV.labelKey]}
                  </LocalizedLink>

                  {/* 헤더의 언어·테마 토글은 시트가 열리면 시트 위에 보이지만 트랩 밖이라
                      키보드로 닿을 수 없었다. 시트가 여는 동안은 이쪽이 그 둘을 갖는다. */}
                  <div className={styles.sheetControls}>
                    <LangMenu />
                    <ThemeToggleButton />
                    <button type="button" className={styles.sheetClose} onClick={close}>
                      {dict.menuCloseLabel}
                    </button>
                  </div>
                </div>
              </div>
              {/* 시트 아래 남은 지면. 닫기 수단은 위 버튼과 헤더 버거, Escape 가 갖는다. */}
              <div className={styles.scrim} aria-hidden="true" onClick={close} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export { MobileMenu };
