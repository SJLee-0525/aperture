"use client";

import { useState } from "react";

import { useLang } from "@/features/lang/use-lang";
import type { Lang } from "@/types/lang";

import styles from "./LangMenu.module.css";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
];

/**
 * 언어 드롭다운 (지구본 → 한국어/English). 디자인에 없는 요소 — 이중언어 지원을 위한 의도적 추가.
 * 데스크톱·모바일 헤더 공용.
 */
const LangMenu = () => {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  const pick = (next: Lang) => {
    setLang(next);
    setOpen(false);
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open}
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
          <button
            type="button"
            className={styles.backdrop}
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div className={styles.menu} role="menu">
            {OPTIONS.map((option) => (
              <button
                key={option.code}
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
        </>
      ) : null}
    </div>
  );
};

export { LangMenu };
