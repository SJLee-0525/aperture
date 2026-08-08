import type { ReactNode } from "react";

import styles from "./TimelineList.module.css";

type Row = { id?: string; period: string; text: string; detail?: ReactNode };
type Props = { label: string; rows: Row[]; className?: string };

/**
 * 경력·학력 타임라인 — 라벨 + (기간 · 제목) 행. 순수 UI. 액센트는 상위 [data-section] 결정.
 *
 * @param {Props} props
 * @param {string} props.label
 * @param {Row[]} props.rows
 * @param {string | undefined} props.className
 * @returns {JSX.Element}
 */
const TimelineList = ({ label, rows, className }: Props) => (
  <div className={`${styles.list} ${className ?? ""}`.trim()}>
    <div className={styles.label}>{label}</div>
    {rows.map((row, index) => (
      <div key={row.id ?? `${row.period}-${row.text}-${index}`} className={styles.row}>
        <span className={styles.period}>{row.period}</span>
        <span className={styles.content}>
          <span className={styles.text}>{row.text}</span>
          {row.detail}
        </span>
      </div>
    ))}
    <div className={styles.end} />
  </div>
);

export { TimelineList };
