"use client";

import { LazyMotion, MotionConfig } from "motion/react";

type Props = {
  children: React.ReactNode;
};

/**
 * domMax를 별도 청크로 — 초기 번들에는 ~6KB m 런타임만 남고 기능 세트는 hydration 후 로드.
 *
 * @returns {Promise<FeatureBundle>}
 */
const loadFeatures = () =>
  import("@/features/motion/_lib/motion-features").then((module) => module.default);

/*
 * 앱 전역 모션 컨텍스트.
 * - LazyMotion + domMax(비동기): animate·variants·exit·hover + **layout 애니메이션**을 lazy 로드
 *   (갤러리 필터/뷰 전환 시 타일 재배치를 FLIP 으로 부드럽게 — domAnimation 엔 layout 미포함).
 *   기능 로드 전 첫 애니메이션은 정적 시작 후 로드 시점에 이어진다(랜딩 인트로 허용 범위).
 * - strict: motion.* 사용을 막고 m.* 만 허용.
 * - reducedMotion="user": prefers-reduced-motion 사용자는 모션 자동 비활성(접근성).
 */
const MotionProvider = ({ children }: Props) => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

export { MotionProvider };
