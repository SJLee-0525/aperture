"use client";

import { STORAGE_KEYS } from "@/constants/storage-keys";

/**
 * 테마 상태의 단일 원천은 React state가 아니라 html[data-theme] 속성.
 * SSR은 테마를 모르므로 state로 들면 hydration mismatch가 필연 —
 * DOM 속성만 플립하고 아이콘 전환은 CSS([data-theme] 셀렉터)가 담당한다.
 */
const useThemeToggle = () => {
  const toggleTheme = () => {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

    if (nextTheme === "dark") {
      root.dataset.theme = "dark";
    } else {
      delete root.dataset.theme;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
    } catch {
      // localStorage 비활성 환경(시크릿 모드 등)에서는 영속만 포기
    }
  };

  return { toggleTheme };
};

export { useThemeToggle };
