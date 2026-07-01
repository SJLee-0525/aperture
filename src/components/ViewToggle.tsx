"use client";

import { Icon } from "@/components/Icon";

import styles from "./ViewToggle.module.css";

type Props = {
  square: boolean;
  onChange: (square: boolean) => void;
  masonryLabel: string;
  squareLabel: string;
};

/** 그리드 뷰 토글 (메이슨리 / 정사각) — 세그먼트 컨트롤 */
const ViewToggle = ({ square, onChange, masonryLabel, squareLabel }: Props) => (
  <div className={styles.seg}>
    <button
      type="button"
      aria-pressed={!square}
      aria-label={masonryLabel}
      onClick={() => onChange(false)}
    >
      <Icon name="mason" size={15} />
    </button>
    <button
      type="button"
      aria-pressed={square}
      aria-label={squareLabel}
      onClick={() => onChange(true)}
    >
      <Icon name="square" size={15} />
    </button>
  </div>
);

export { ViewToggle };
