import styles from "./TimelineList.module.css";

type Row = { period: string; text: string };
type Props = { label: string; rows: Row[]; className?: string };

/** 경력·학력 타임라인 — 라벨 + (기간 · 제목) 행. 순수 UI. 액센트는 상위 [data-section] 결정. */
const TimelineList = ({ label, rows, className }: Props) => (
  <div className={`${styles.list} ${className ?? ""}`.trim()}>
    <div className={styles.label}>{label}</div>
    {rows.map((row) => (
      <div key={`${row.period}-${row.text}`} className={styles.row}>
        <span className={styles.period}>{row.period}</span>
        <span className={styles.text}>{row.text}</span>
      </div>
    ))}
    <div className={styles.end} />
  </div>
);

export { TimelineList };
