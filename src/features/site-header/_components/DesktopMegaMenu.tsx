"use client";

import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useEscapeKey } from "@/hooks/use-escape-key";

import { CONTACT_NAV, MEGA_MENU, type NavSection } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { sectionFromPath } from "@/constants/sections";
import { stripLangPrefix } from "@/lib/i18n/locale-path";

import type { UIDict } from "@/constants/dictionary";

import styles from "./SiteHeader.module.css";

type MegaMenuGroupProps = {
  dict: UIDict;
  group: (typeof MEGA_MENU)[number];
  isCurrent: boolean;
  isOpen: boolean;
  onClose: () => void;
  onHoverEnd: (section: NavSection) => void;
  onHoverStart: (section: NavSection) => void;
  onPinToggle: (section: NavSection) => void;
};

/** 열림 상태가 바뀐 그룹만 다시 렌더하도록 각 mega-menu 그룹을 격리한다. */
const MegaMenuGroup = memo(
  ({
    dict,
    group,
    isCurrent,
    isOpen,
    onClose,
    onHoverEnd,
    onHoverStart,
    onPinToggle,
  }: MegaMenuGroupProps) => (
    <div
      data-section={group.section}
      className={`${styles.megaItem} ${isCurrent ? styles.current : ""} ${
        isOpen ? styles.open : ""
      }`}
      onMouseEnter={() => onHoverStart(group.section)}
      onMouseLeave={() => onHoverEnd(group.section)}
      onFocus={() => onHoverStart(group.section)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onHoverEnd(group.section);
        }
      }}
    >
      <button
        type="button"
        className={styles.megaBtn}
        aria-expanded={isOpen}
        aria-current={isCurrent ? "true" : undefined}
        onClick={() => onPinToggle(group.section)}
      >
        {dict[group.labelKey]}
      </button>
      <div className={styles.megaPanel}>
        {group.links.map((link) => (
          <LocalizedLink
            key={link.href}
            href={link.href}
            className={styles.megaLink}
            onClick={onClose}
          >
            {dict[link.labelKey]}
          </LocalizedLink>
        ))}
      </div>
    </div>
  ),
);

MegaMenuGroup.displayName = "MegaMenuGroup";

/**
 * 데스크톱 mega-menu. 패널 상호작용 상태를 헤더의 나머지 컨트롤과 격리한다.
 *
 * @returns {JSX.Element}
 */
const DesktopMegaMenu = () => {
  const { dict } = useLang();
  const pathname = usePathname();
  const section = sectionFromPath(pathname);
  const contactCurrent = stripLangPrefix(pathname).startsWith(ROUTES.CONTACT);
  const [hovered, setHovered] = useState<NavSection | null>(null);
  const [pinned, setPinned] = useState<NavSection | null>(null);
  const shown = pinned ?? hovered;
  const navRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback(() => {
    setPinned(null);
    setHovered(null);
  }, []);
  const startHover = useCallback((next: NavSection) => setHovered(next), []);
  const endHover = useCallback(
    (target: NavSection) => setHovered((current) => (current === target ? null : current)),
    [],
  );
  const togglePinned = useCallback(
    (next: NavSection) => setPinned((current) => (current === next ? null : next)),
    [],
  );

  useEscapeKey(pinned != null, closeMenu);

  useEffect(() => {
    if (!pinned) return;

    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setPinned(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  return (
    <nav ref={navRef} className={styles.mega} aria-label={dict.primaryNavLabel}>
      {MEGA_MENU.map((group) => (
        <MegaMenuGroup
          key={group.section}
          dict={dict}
          group={group}
          isCurrent={section === group.section}
          isOpen={shown === group.section}
          onClose={closeMenu}
          onHoverEnd={endHover}
          onHoverStart={startHover}
          onPinToggle={togglePinned}
        />
      ))}
      <div
        data-section="contact"
        className={`${styles.megaItem} ${contactCurrent ? styles.current : ""}`}
      >
        <LocalizedLink
          href={CONTACT_NAV.href}
          className={styles.megaBtn}
          aria-current={contactCurrent ? "page" : undefined}
          onClick={closeMenu}
        >
          {dict[CONTACT_NAV.labelKey]}
        </LocalizedLink>
      </div>
    </nav>
  );
};

export { DesktopMegaMenu };
