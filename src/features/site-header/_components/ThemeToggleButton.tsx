"use client";

import { useCallback, useEffect, useRef } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useThemeToggle } from "@/features/theme/_hooks/use-theme-toggle";

import styles from "./ThemeToggleButton.module.css";

/**
 * 테마 토글 — 해/달 "지고 뜨는" 전환. 두 SVG를 겹쳐 두고 CSS([data-theme=dark])로
 * translate-y + opacity 크로스페이드. mounted 게이팅 없이 첫 페인트부터 정확하고
 * 첫 로드엔 transition이 안 걸려 정지 상태로 그려진다.
 *
 * @returns {JSX.Element}
 */
const ThemeToggleButton = () => {
  const { dict } = useLang();
  const { toggleTheme } = useThemeToggle();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 아이콘 둘 다 aria-hidden 이라 라벨만으로는 지금 어느 테마인지 알 수 없다.
  // 첫 페인트 값은 인라인 스크립트가 정하므로 렌더에 넣으면 hydration 이 어긋난다.
  // 마운트 뒤 DOM 에서 한 번 맞추고 이후에는 토글이 갱신한다.
  const syncPressed = useCallback(() => {
    buttonRef.current?.setAttribute(
      "aria-pressed",
      String(document.documentElement.dataset.theme === "dark"),
    );
  }, []);

  useEffect(syncPressed, [syncPressed]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        toggleTheme();
        syncPressed();
      }}
      aria-label={dict.themeLabel}
      className={styles.btn}
    >
      <span className={styles.icons}>
        <span className={styles.sun}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        </span>
        <span className={styles.moon}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
      </span>
    </button>
  );
};

export { ThemeToggleButton };
