"use client";

import { useRouter } from "next/navigation";
import { useId, useRef } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { usePopupDisclosure } from "@/hooks/use-popup-disclosure";
import { useRovingListFocus } from "@/hooks/use-roving-list-focus";

import { langFromPath, switchLangPath } from "@/lib/i18n/locale-path";

import type { Lang } from "@/types/lang";

import styles from "./LangMenu.module.css";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
];

/**
 * 언어 드롭다운 (지구본 → 한국어/English). 디자인에 없는 요소 — 이중언어 지원을 위한 의도적 추가.
 * 데스크톱·모바일 헤더 공용.
 *
 * @returns {JSX.Element}
 */
const LangMenu = () => {
  const { dict, lang, setLang } = useLang();
  const router = useRouter();
  const { open, triggerRef, rootRef, toggle, close, dismiss } = usePopupDisclosure<
    HTMLButtonElement,
    HTMLDivElement
  >();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const currentIndex = Math.max(
    OPTIONS.findIndex((option) => option.code === lang),
    0,
  );
  const onMenuKeyDown = useRovingListFocus(open, menuRef, { activeIndex: currentIndex });

  const pick = (next: Lang) => {
    setLang(next); // 선호 저장 — 로케일 밖(관리자)에선 이것만으로 전환 완료
    close();
    // 공개 트리(/ko·/en)에선 같은 페이지의 다른 언어 경로로 이동한다 (구글 권장 — 언어별 별도 URL).
    const { pathname, search, hash } = window.location;
    if (langFromPath(pathname)) {
      router.push(switchLangPath(next, `${pathname}${search}${hash}`), { scroll: false });
    }
  };

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={dict.languageLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={styles.btn}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.6 2.7 2.6 15.3 0 18c-2.6-2.7-2.6-15.3 0-18z" />
        </svg>
      </button>
      {open ? (
        <>
          {/* 바깥 클릭은 usePopupDisclosure 가 받는다. 이 층은 뒤 콘텐츠의 hover 를 막는
              시각 요소일 뿐이라 접근성 트리에 넣지 않는다. */}
          <div className={styles.backdrop} aria-hidden="true" onPointerDown={dismiss} />
          <div className={styles.panel}>
            <div id={menuId} ref={menuRef} role="menu" onKeyDown={onMenuKeyDown}>
              {OPTIONS.map((option) => (
                <button
                  key={option.code}
                  data-list-item
                  type="button"
                  role="menuitemradio"
                  aria-checked={lang === option.code}
                  onClick={() => pick(option.code)}
                  className={styles.option}
                >
                  <span>{option.label}</span>
                  <span className={`${styles.check} ${lang === option.code ? styles.checkOn : ""}`}>
                    ●
                  </span>
                </button>
              ))}
            </div>
            <p className={styles.note}>{dict.languagePreferenceNote}</p>
          </div>
        </>
      ) : null}
    </div>
  );
};

export { LangMenu };
