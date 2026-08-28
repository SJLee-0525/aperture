import { Skeleton } from "@/components/Skeleton";

import styles from "./loading.module.css";

/* 메이슨리 타일이 자연스러워 보이도록 높이 편차를 준다(3:4·1:1·3:2 등 반복). */
const TILE_ASPECTS = [0.75, 1, 1.4, 0.72, 1.2, 0.85, 1, 0.7, 1.35, 0.78, 1.1, 0.9];
/* 데스크톱은 세 개, 모바일은 CSS로 앞의 두 개만 노출한다. */
const CHIP_WIDTHS = [64, 88, 52];

/**
 * 작업(홈) RSC fetch 동안의 스켈레톤 — 검색은 내비게이션에 두고 툴바·FilterBar·메이슨리를 실제 셸과 정합한다.
 */
export default function WorkLoading() {
  return (
    <main className="u-page-main u-loading-shell" aria-busy="true">
      <div className={styles.toolbar}>
        <div className={styles.titleLine}>
          <Skeleton width={76} height={32} />
        </div>
        <div className={styles.tools}>
          <Skeleton width={64} height={16} />
          <Skeleton width={84} height={37} />
        </div>
      </div>

      <div className={styles.bar}>
        <div className={styles.tagbar}>
          {CHIP_WIDTHS.map((width, index) => (
            <Skeleton key={`chip-${index}`} width={width} height={30} radius={999} />
          ))}
        </div>
        <Skeleton width={34} height={34} />
      </div>

      <div className={styles.mason}>
        {TILE_ASPECTS.map((aspect, index) => (
          <div key={`tile-${index}`} className={styles.cell}>
            <Skeleton aspectRatio={aspect} />
          </div>
        ))}
      </div>
    </main>
  );
}
