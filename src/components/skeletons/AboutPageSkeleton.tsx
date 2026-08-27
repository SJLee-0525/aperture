import { Skeleton } from "@/components/Skeleton";

import styles from "./AboutPageSkeleton.module.css";

const ABOUT_LINES = ["100%", "92%", "64%"];
const ABOUT_ROW_WIDTHS = ["78%", "64%", "70%", "52%"];

/**
 * 섹션 소개 지면 자리표시자.
 *
 * @param props.extended 개발 소개처럼 아래에 인터뷰 문답이 이어질 때 켠다.
 */
const AboutPageSkeleton = ({ extended = false }: { extended?: boolean }) => (
  <main className={`u-loading-shell ${styles.about}`} aria-busy="true">
    <header className={styles.aboutHero}>
      <Skeleton width={92} height={18} />
      <Skeleton className={styles.aboutTitle} width="70%" height={56} />
      <div className={styles.aboutCopy}>
        {ABOUT_LINES.map((width, index) => (
          <Skeleton key={`about-copy-${index}`} width={width} height={16} />
        ))}
      </div>
    </header>

    <div className={styles.stats}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`stat-${index}`} className={styles.stat}>
          <Skeleton width={64} height={36} />
          <Skeleton width={72} height={10} />
        </div>
      ))}
    </div>

    <div className={styles.aboutColumns}>
      {Array.from({ length: 2 }).map((_, columnIndex) => (
        <div key={`about-column-${columnIndex}`}>
          <Skeleton width={72} height={11} />
          <div className={styles.aboutList}>
            {ABOUT_ROW_WIDTHS.map((width, rowIndex) => (
              <Skeleton key={`about-${columnIndex}-${rowIndex}`} width={width} height={14} />
            ))}
          </div>
        </div>
      ))}
    </div>

    {extended ? (
      <div className={styles.qa}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`qa-${index}`} className={styles.qaItem}>
            <Skeleton width="54%" height={19} />
            <Skeleton width="100%" height={14} radius={0} />
            <Skeleton width="82%" height={14} radius={0} />
          </div>
        ))}
      </div>
    ) : null}
  </main>
);

export { AboutPageSkeleton };
