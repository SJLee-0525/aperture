import { Skeleton } from "@/components/Skeleton";

import styles from "./loading.module.css";

const CARD_COUNT = 8;

/** 앨범 그리드 RSC fetch 동안의 스켈레톤 — AlbumsView/AlbumCard 셸(1:1 커버 + 제목·메타)을 흉내. */
export default function AlbumsLoading() {
  return (
    <main className={styles.main}>
      <Skeleton className={styles.title} width={140} height={30} />
      <div className={styles.grid}>
        {Array.from({ length: CARD_COUNT }).map((_, index) => (
          <div key={`album-${index}`}>
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
}
