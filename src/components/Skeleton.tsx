import type { CSSProperties } from "react";

import styles from "./Skeleton.module.css";

type Props = {
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  radius?: number;
  className?: string;
};

const toSize = (value?: number | string) => (typeof value === "number" ? `${value}px` : value);

/**
 * 로딩 자리표시 블록. 스피너 대신 셸 레이아웃을 흉내 내 CLS 를 막는다.
 * prefers-reduced-motion 에서는 pulse 없이 정적 블록으로 그린다.
 */
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
