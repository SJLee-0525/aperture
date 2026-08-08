import type { CSSProperties } from "react";

import styles from "./Skeleton.module.css";

type Props = {
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  radius?: number;
  className?: string;
};

/**
 * 로딩 자리표시 블록 — surface-2 배경에 은은한 pulse(하이라이트 surface-3).
 * 스피너 대신 셸 레이아웃을 흉내 내 CLS 방지. 크기는 props → 인라인 스타일로 지정.
 * prefers-reduced-motion 에서는 애니메이션 비활성(정적 블록).
 *
 * @param {number | string} [value]
 * @returns {string | undefined}
 */
const toSize = (value?: number | string) => (typeof value === "number" ? `${value}px` : value);

const Skeleton = ({ width, height, aspectRatio, radius, className }: Props) => {
  const style: CSSProperties = {
    width: toSize(width),
    height: toSize(height),
    aspectRatio: aspectRatio,
    borderRadius: radius != null ? `${radius}px` : undefined,
  };

  return (
    <span
      aria-hidden
      className={className ? `${styles.block} ${className}` : styles.block}
      style={style}
    />
  );
};

export { Skeleton };
