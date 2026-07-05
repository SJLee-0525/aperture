import { BrandLoader } from "@/components/BrandLoader";

import styles from "./IntroSplash.module.css";

/**
 * 첫(하드) 로딩 인트로 스플래시 — 잠깐 떠올랐다 사라지며 콘텐츠를 드러낸다.
 * - 순수 CSS 자동 디스미스(JS 없음). SSR 로 첫 페인트부터 덮어 콘텐츠 깜빡임 방지.
 * - (public)/layout 에 마운트 → 소프트 내비에선 재생 안 되고, 하드 로드(첫 방문·새로고침)마다 1회.
 * - 장식용이라 aria-hidden(콘텐츠는 뒤에 그대로 → SEO·스크린리더 영향 없음).
 * - prefers-reduced-motion 시 CSS 규칙이 스플래시를 생략(즉시 콘텐츠 노출).
 */
const IntroSplash = () => (
  <div aria-hidden="true" data-intro-splash className={styles.splash}>
    <BrandLoader />
  </div>
);

export { IntroSplash };
