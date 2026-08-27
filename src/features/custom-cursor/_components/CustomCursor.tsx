"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { useCursorPointerEvents } from "@/features/custom-cursor/_hooks/use-cursor-pointer-events";

import { setCursorLoading } from "@/utils/custom-cursor-events";

import styles from "./CustomCursor.module.css";

/**
 * 기본 커서를 대신하는 포인터 표시.
 *
 * 요소 둘과 그리기 상태만 갖는다. 입력 연결은 `useCursorPointerEvents` 가, 좌표와 모드
 * 판정은 `cursor-state` 가, 가운데 버튼 스크롤은 `auto-scroll-controller` 가 맡는다.
 */
const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const autoScrollAnchorRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
    // 이동이 끝났다는 유일한 신호가 경로 변화다.
    setCursorLoading("route", false);
  }, [pathname]);

  useCursorPointerEvents({
    cursorRef,
    autoScrollAnchorRef,
    getPathname: useCallback(() => pathnameRef.current, []),
  });

  return (
    <>
      <div
        ref={cursorRef}
        className={styles.cursor}
        data-custom-cursor-ui
        data-visible="false"
        aria-hidden="true"
      >
        <span className={styles.shape} />
        <span className={styles.markerDot} />
        <span className={styles.markerArrow}>
          <svg viewBox="0 0 14 14">
            <path d="M2 2h8v8" />
          </svg>
        </span>
        <span className={styles.rangeIndicator}>
          <svg viewBox="0 0 34 18">
            <path d="M7 5 3 9l4 4M27 5l4 4-4 4" />
            <circle cx="17" cy="9" r="2.25" />
          </svg>
        </span>
        <span className={styles.scrollbarIndicator}>
          <svg viewBox="0 0 20 28">
            <path d="m6.5 9 3.5-3.5L13.5 9M6.5 19l3.5 3.5 3.5-3.5" />
          </svg>
        </span>
        <span className={styles.autoScrollDirection}>
          <svg viewBox="0 0 16 16">
            <path d="m4 10 4-4 4 4" />
          </svg>
        </span>
        <span className={styles.loadingOrbit}>
          <svg viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="10.5" />
          </svg>
        </span>
        <span className={`${styles.corner} ${styles.cornerTopLeft}`} />
        <span className={`${styles.corner} ${styles.cornerTopRight}`} />
        <span className={`${styles.corner} ${styles.cornerBottomLeft}`} />
        <span className={`${styles.corner} ${styles.cornerBottomRight}`} />
      </div>
      <div
        ref={autoScrollAnchorRef}
        className={styles.autoScrollAnchor}
        data-autoscroll-anchor
        data-visible="false"
        aria-hidden="true"
      />
    </>
  );
};

export { CustomCursor };
