import { Skeleton } from "@/components/Skeleton";
import { PageTitleSkeleton } from "@/components/skeletons/PageTitleSkeleton";

import styles from "./CardGridPageSkeleton.module.css";

const GRID_CONFIG = {
  poster: { count: 3, aspectRatio: 0.75, gridClass: styles.posterGrid, showInfo: true },
  project: { count: 4, aspectRatio: 16 / 9, gridClass: styles.projectGrid, showInfo: true },
  media: { count: 4, aspectRatio: 16 / 9, gridClass: styles.mediaGrid, showInfo: false },
} as const;

type GridKind = keyof typeof GRID_CONFIG;

/** 연주 포스터·프로젝트 카드·영상 카드 목록의 로딩 자리표시자. */
const CardGridPageSkeleton = ({ kind }: { kind: GridKind }) => {
  const config = GRID_CONFIG[kind];

  return (
    <main className="u-page-main u-loading-shell" aria-busy="true">
      <PageTitleSkeleton />
      <div className={`${styles.cardGrid} ${config.gridClass}`}>
        {Array.from({ length: config.count }).map((_, index) => (
          <div key={`${kind}-${index}`}>
            <Skeleton aspectRatio={config.aspectRatio} />
            {config.showInfo ? (
              <div className={styles.cardInfo}>
                <Skeleton width="72%" height={18} />
                <Skeleton width="48%" height={12} radius={0} />
                {kind === "project" ? <Skeleton width="92%" height={12} radius={0} /> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
};

export { CardGridPageSkeleton };
export type { GridKind };
