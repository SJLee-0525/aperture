"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href]:not([aria-disabled="true"]), button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])';

/**
 * 모달·오버레이 포커스 트랩. active인 동안:
 * - 컨테이너로 포커스 이동(첫 진입), Tab/Shift+Tab을 내부로 순환
 * - 비활성화 시 직전 포커스 요소로 복귀
 * 컨테이너에는 tabIndex={-1} 필요.
 *
 * @param {boolean} active
 * @returns {RefObject<HTMLDivElement | null>}
 */
const useFocusTrap = (active: boolean) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // 긴 모달에서 기본 focus()는 컨테이너를 보이게 하려고 오버레이를 아래로 스크롤한다.
    container.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          el.offsetParent !== null &&
          !el.hasAttribute("hidden") &&
          el.getAttribute("aria-hidden") !== "true",
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey && (activeEl === first || activeEl === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active]);

  return ref;
};

export { useFocusTrap };
