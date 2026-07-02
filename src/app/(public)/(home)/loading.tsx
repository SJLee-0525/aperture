import { Skeleton } from "@/components/Skeleton";

import styles from "./loading.module.css";

/* 메이슨리 타일이 자연스러워 보이도록 높이 편차를 준다(3:4·1:1·3:2 등 반복). */
const TILE_ASPECTS = [0.75, 1, 1.4, 0.72, 1.2, 0.85, 1, 0.7, 1.35, 0.78, 1.1, 0.9];
/* 실제 태그 사전(~18개)처럼 2줄로 감기도록 칩을 넉넉히. */
const CHIP_WIDTHS = [64, 88, 52, 76, 60, 96, 72, 84, 56, 100, 68, 80, 58, 92, 74, 62];

/** 작업(홈) RSC fetch 동안의 스켈레톤 — GalleryView 셸(툴바·FilterBar·메이슨리)을 실측 정합해 CLS 방지. */
export default function WorkLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.toolbar}>
        <div className={styles.titleLine}>
          <Skeleton width={150} height={34} />
        </div>
        <div className={styles.tools}>
          <Skeleton width={72} height={16} />
          <Skeleton width={96} height={30} />
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
