"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

type Props = {
  children: React.ReactNode;
};

/*
 * 앱 전역 모션 컨텍스트.
 * - LazyMotion + domAnimation: animate·variants·exit·hover 기능만 lazy 로드 (drag/layout 제외 → 번들 최소).
 * - strict: motion.* 사용을 막고 m.* 만 허용 → 무거운 풀 번들 유입 차단.
 * - reducedMotion="user": prefers-reduced-motion 사용자는 모션 자동 비활성.
 */
const MotionProvider = ({ children }: Props) => (
  <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

export { MotionProvider };
