import { Skeleton } from "@/components/Skeleton";

import styles from "./loading.module.css";

/* 상세는 히어로 아래 메이슨리로 사진을 나열 — 높이 편차로 자연스럽게. */
const TILE_ASPECTS = [1, 0.75, 1.35, 0.8, 1.2, 0.7, 1, 0.9];

/**
 * 앨범 상세 RSC fetch 동안의 스켈레톤 — AlbumDetailView 셸(hero 300px + 메이슨리)을 흉내.
 *
 * @returns {JSX.Element}
 */
export default function AlbumDetailLoading() {
  return (
    <div className="u-loading-shell" aria-busy="true">
      <Skeleton className={styles.hero} height={300} />
      <main className={styles.main}>
        <div className={styles.mason}>
          {TILE_ASPECTS.map((aspect, index) => (
            <div key={`tile-${index}`} className={styles.cell}>
              <Skeleton aspectRatio={aspect} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
