"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 통계 숫자 카운트업 (0 → value). prefers-reduced-motion 사용자는 애니메이션 없이 최종값 표시.
 * 프레임마다 바뀌는 값은 React 상태 대신 textContent 직접 갱신 — 카운터당 초당 ~60회 재렌더를 없앤다.
 * 소개 페이지(사진·음악) 공용 순수 UI.
 */
const CountUp = ({ value }: { value: number }) => {
  const reduce = useReducedMotion();
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (reduce || !node) return; // 감소 모션 사용자: 초기값(=value) 그대로.
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (latest) => {
        node.textContent = String(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  // 원본 동작 유지: 애니메이션 대상은 0에서 시작, 모션 감소 사용자는 최종값 즉시 표시.
  return <span ref={nodeRef}>{reduce ? value : 0}</span>;
};

export { CountUp };
