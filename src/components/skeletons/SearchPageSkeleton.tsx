import { Skeleton } from "@/components/Skeleton";
import { PageTitleSkeleton } from "@/components/skeletons/PageTitleSkeleton";

import styles from "./SearchPageSkeleton.module.css";

const SEARCH_GROUPS = [4, 3, 3];

/** 통합 검색 결과 자리표시자. 섹션 그룹 셋과 그 안의 행을 흉내낸다. */
const SearchPageSkeleton = () => (
  <main className={`u-loading-shell ${styles.search}`} aria-busy="true">
    <PageTitleSkeleton />
    <div className={styles.searchGroups}>
      {SEARCH_GROUPS.map((rowCount, groupIndex) => (
        <section key={`search-${groupIndex}`} className={styles.searchGroup}>
          <Skeleton width={64} height={11} />
          <div className={styles.searchRows}>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div key={`search-${groupIndex}-${rowIndex}`} className={styles.searchRow}>
                <Skeleton width={64} height={48} radius={0} />
                <div className={styles.searchCopy}>
                  <Skeleton width={rowIndex % 2 === 0 ? "68%" : "52%"} height={16} />
                  <Skeleton width="32%" height={11} radius={0} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  </main>
);

export { SearchPageSkeleton };
