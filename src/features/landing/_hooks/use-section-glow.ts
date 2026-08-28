"use client";

import { type RefObject, useCallback } from "react";

/**
 * 배경 글로우 중심을 포인터·포커스가 올라온 섹션 행 한가운데로 옮긴다(평상시엔 우상단에서 부유).
 * 행 폭·위치는 언어(개발 ↔ Development)와 뷰포트 폭에 따라 달라져 CSS 퍼센트로는 맞출 수 없어 실측한다.
 * 값은 ref 로 직접 스타일에 써서 리렌더 없이 CSS 전환만 태운다. 색·세기는 CSS `:has()` 가 담당.
 * 이벤트는 포인터·포커스 양쪽을 받으므로 currentTarget 만 요구한다.
 */
const useSectionGlow = (heroRef: RefObject<HTMLElement | null>) => {
  const onRowEnter = useCallback(
    (event: { currentTarget: HTMLElement }) => {
      const hero = heroRef.current;
      if (!hero) return;

      const row = event.currentTarget.getBoundingClientRect();
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty("--glow-x", `${row.left + row.width / 2 - bounds.left}px`);
      hero.style.setProperty("--glow-y", `${row.top + row.height / 2 - bounds.top}px`);
    },
    [heroRef],
  );

  // 지우면 .hero 클래스의 기본값(중앙 아래)으로 되돌아가며 전환된다.
  const onRowLeave = useCallback(() => {
    const hero = heroRef.current;
    if (!hero) return;

    hero.style.removeProperty("--glow-x");
    hero.style.removeProperty("--glow-y");
  }, [heroRef]);

  return { onRowEnter, onRowLeave };
};

export { useSectionGlow };
