import { Skeleton } from "@/components/Skeleton";

import styles from "./loading.module.css";

const STAT_COUNT = 4;
const LIST_COLUMNS = 2;
const BIO_LINES = ["100%", "96%", "62%"];
const LIST_ROW_WIDTHS = ["78%", "64%", "70%", "52%"];

/** 소개 RSC fetch 동안의 스켈레톤 — AboutView 셸(히어로 + 통계 4칸 + 2열 리스트)을 흉내. */
export default function AboutLoading() {
  return (
    <main className={styles.about}>
      <header className={styles.hero}>
        <Skeleton width="70%" height={56} />
        <div className={styles.bio}>
          {BIO_LINES.map((width, index) => (
            <Skeleton key={`bio-${index}`} width={width} height={16} />
          ))}
        </div>
        <div className={styles.contact}>
          <Skeleton width={88} height={16} />
          <Skeleton width={104} height={16} />
        </div>
      </header>

      <div className={styles.stats}>
        {Array.from({ length: STAT_COUNT }).map((_, index) => (
          <div key={`stat-${index}`} className={styles.stat}>
            <Skeleton width={64} height={36} />
            <Skeleton width={72} height={10} />
          </div>
        ))}
      </div>

      <div className={styles.cols}>
        {Array.from({ length: LIST_COLUMNS }).map((_, columnIndex) => (
          <div key={`col-${columnIndex}`}>
            <Skeleton width={72} height={11} />
            <div className={styles.list}>
              {LIST_ROW_WIDTHS.map((width, rowIndex) => (
                <Skeleton key={`row-${columnIndex}-${rowIndex}`} width={width} height={14} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
