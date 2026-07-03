import styles from "./SectionHeading.module.css";

type Props = { num: string; title: string; desc?: string };

/** 섹션 헤더 — 번호 + 제목 (+ 설명). 상단 구분선. 음악·개발 섹션 공용 순수 UI. */
const SectionHeading = ({ num, title, desc }: Props) => (
  <div className={styles.head}>
    <div className={styles.left}>
      <span className={styles.num}>{num}</span>
      <h2 className={styles.title}>{title}</h2>
    </div>
    {desc ? <span className={styles.desc}>{desc}</span> : null}
  </div>
);

export { SectionHeading };
