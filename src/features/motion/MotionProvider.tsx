"use client";

import { domMax, LazyMotion, MotionConfig } from "motion/react";

type Props = {
  children: React.ReactNode;
};

/*
 * 앱 전역 모션 컨텍스트.
 * - LazyMotion + domMax: animate·variants·exit·hover + **layout 애니메이션**을 lazy 로드
 *   (갤러리 필터/뷰 전환 시 타일 재배치를 FLIP 으로 부드럽게 — domAnimation 엔 layout 미포함).
 * - strict: motion.* 사용을 막고 m.* 만 허용.
 * - reducedMotion="user": prefers-reduced-motion 사용자는 모션 자동 비활성(접근성).
 */
const MotionProvider = ({ children }: Props) => (
  <LazyMotion features={domMax} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

export { MotionProvider };
