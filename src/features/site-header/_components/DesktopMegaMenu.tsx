"use client";

import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";

import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useEscapeKey } from "@/hooks/use-escape-key";

import { CONTACT_NAV, MEGA_MENU, type NavSection } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { stripLangPrefix } from "@/lib/i18n/locale-path";
import { sectionFromPath } from "@/lib/navigation/section-from-path";

import type { UIDict } from "@/constants/dictionary";

import styles from "./SiteHeader.module.css";

type MegaMenuGroupProps = {
  dict: UIDict;
  group: (typeof MEGA_MENU)[number];
  isCurrent: boolean;
  isOpen: boolean;
  onClose: () => void;
  onLeave: (section: NavSection) => void;
  onHoverStart: (section: NavSection) => void;
  onPinToggle: (section: NavSection) => void;
};

/**
 * mega-menu 한 그룹. APG 의 Disclosure Navigation 패턴이다 — 버튼이 패널을 여닫고
 * 패널은 링크 목록이라 `role="menu"` 계열을 쓰지 않는다.
 *
 * 포커스만으로는 패널을 열지 않는다. Tab 진입마다 하위 링크가 탭 순서에 들어오면 본문에
 * 닿기까지 20회 가까이 눌러야 하고, 그렇게 열린 패널은 pinned 가 비어 Escape 가 닫을
 * 대상을 모른다. 키보드는 Enter·Space 로 연다.
 *
 * 열림 상태가 바뀐 그룹만 다시 렌더하도록 격리한다.
 */
const MegaMenuGroup = memo(
  ({ dict, group, isCurrent, isOpen, onClose, onLeave, onHoverStart, onPinToggle }: MegaMenuGroupProps) => {
    const panelId = useId();

    return (
      <div
        data-section={group.section}
        data-mega-group={group.section}
        className={`${styles.megaItem} ${isCurrent ? styles.current : ""} ${
          isOpen ? styles.open : ""
        }`}
        onMouseEnter={() => onHoverStart(group.section)}
        onMouseLeave={() => onLeave(group.section)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            onLeave(group.section);
          }
        }}
      >
        <button
          type="button"
          className={styles.megaBtn}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          aria-current={isCurrent ? "true" : undefined}
          onClick={() => onPinToggle(group.section)}
        >
          {dict[group.labelKey]}
        </button>
        <div id={panelId} className={styles.megaPanel}>
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
    );
  },
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
  /** 마우스가 나가거나 포커스가 그룹 밖으로 가면 그 그룹의 hover 와 pin 을 함께 놓는다. */
  const leaveGroup = useCallback((target: NavSection) => {
    setHovered((current) => (current === target ? null : current));
    setPinned((current) => (current === target ? null : current));
  }, []);
  const togglePinned = useCallback(
    (next: NavSection) => setPinned((current) => (current === next ? null : next)),
    [],
  );

  /** 닫을 때 포커스가 패널 안에 있으면 그 그룹의 버튼으로 되돌린다. 패널이 사라지면서
      포커스가 body 로 떨어지면 다음 Tab 이 지면 처음부터 다시 시작한다. */
  const closeAndRestoreFocus = useCallback(() => {
    const trigger = navRef.current?.querySelector<HTMLButtonElement>(
      `[data-mega-group="${pinned}"] button`,
    );
    closeMenu();
    trigger?.focus();
  }, [closeMenu, pinned]);

  // 포커스로는 패널이 열리지 않으므로 키보드로 연 패널은 항상 pinned 다.
  useEscapeKey(pinned != null, closeAndRestoreFocus);

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
          onLeave={leaveGroup}
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
