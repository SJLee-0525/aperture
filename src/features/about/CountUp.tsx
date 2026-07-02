"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 통계 숫자 카운트업 (0 → value). prefers-reduced-motion 사용자는 애니메이션 없이 최종값 표시.
 * animate() 는 프레임마다 onUpdate 로 상태를 갱신(값이 작아 부담 없음).
 */
const CountUp = ({ value }: { value: number }) => {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) return; // 감소 모션 사용자: 초기값(=value) 그대로.
    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <>{display}</>;
};

export { CountUp };
