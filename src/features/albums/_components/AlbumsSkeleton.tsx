import { Skeleton } from "@/components/Skeleton";

import styles from "./AlbumsSkeleton.module.css";

const CARD_COUNT = 8;

/**
 * 앨범 그리드 RSC fetch 동안의 스켈레톤 — AlbumsView/AlbumCard 셸(1:1 커버 + 제목·메타)을 흉내.
 *
 * @returns {JSX.Element}
 */
const AlbumsSkeleton = () => (
  <main className={styles.main} aria-busy="true">
    <div className={styles.title}>
      <Skeleton width={150} height={34} />
    </div>
    <div className={styles.grid}>
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <div key={`album-${index}`} className={styles.cell}>
          <Skeleton aspectRatio={1} />
          <div className={styles.info}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="45%" height={12} radius={0} />
          </div>
        </div>
      ))}
    </div>
  </main>
);

export { AlbumsSkeleton };
