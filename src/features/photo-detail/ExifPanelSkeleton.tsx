import { Skeleton } from "@/components/Skeleton";

import styles from "./ExifPanelSkeleton.module.css";

// 실제 ExifPanel 은 기본 7행 + fileName(선택) → 보통 8행. 8행 기준으로 높이 예약.
const ROWS = 8;

/**
 * ExifPanel 로딩 스켈레톤 — 좌측 이미지 로드 전까지 우측 패널 자리를 채운다.
 * 각 구간 높이를 실제 패널의 측정값으로 예약해 로드 시 레이아웃이 튀지 않는다.
 * (구조도 실제와 동일: head → exifHead → triangle → list → minimap → tags)
 */
const ExifPanelSkeleton = () => (
  <div className={styles.panel} aria-hidden="true">
    <div className={styles.head}>
      <div className={styles.titleWrap}>
        <div className={styles.titleLine}>
          <Skeleton width="72%" height={26} />
        </div>
        <div className={styles.dateLine}>
          <Skeleton width={96} height={12} />
        </div>
      </div>
      <Skeleton width={40} height={30} radius={999} />
    </div>

    <div>
      <div className={styles.exifHead}>
        <Skeleton width={120} height={15} />
        <Skeleton width={84} height={11} />
      </div>
      <div className={styles.triangle}>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.tri}>
            <Skeleton width={38} height={10} />
            <Skeleton width="80%" height={30} />
          </div>
        ))}
      </div>
      <div className={styles.list}>
        {Array.from({ length: ROWS }).map((_, index) => (
          <div key={index} className={styles.row}>
            <Skeleton width={64} height={13} />
            <Skeleton width="42%" height={13} />
          </div>
        ))}
      </div>
    </div>

    <Skeleton height={148} />

    <div className={styles.tags}>
      <Skeleton width={54} height={30} radius={999} />
      <Skeleton width={70} height={30} radius={999} />
      <Skeleton width={46} height={30} radius={999} />
    </div>
  </div>
);

export { ExifPanelSkeleton };
