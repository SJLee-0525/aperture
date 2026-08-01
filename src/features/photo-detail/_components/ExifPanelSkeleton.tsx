import { Skeleton } from "@/components/Skeleton";
import type { Photo } from "@/types/photo";

import styles from "./ExifPanelSkeleton.module.css";

type Props = {
  photo?: Pick<Photo, "fileName">;
  tagCount: number;
};

const TAG_WIDTHS = [54, 70, 46] as const;

/**
 * ExifPanel 로딩 스켈레톤 — 좌측 이미지 로드 전까지 우측 패널 자리를 채운다.
 * 각 구간 높이를 실제 패널의 측정값으로 예약해 로드 시 레이아웃이 튀지 않는다.
 * (구조도 실제와 동일: head → exifHead → triangle → list → minimap → tags)
 */
const ExifPanelSkeleton = ({ photo, tagCount }: Props) => {
  // 실제 패널은 기본 EXIF 7행 + 파일명이 있을 때만 1행을 추가한다.
  const rowCount = photo?.fileName ? 8 : 7;

  return (
    <div className={styles.panel} aria-hidden="true">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <div className={styles.titleWrap}>
            <div className={styles.titleLine}>
              <Skeleton width="72%" height={26} />
            </div>
          </div>
          <Skeleton width={32} height={32} />
        </div>
        <div className={styles.exifHead}>
          <Skeleton width={120} height={15} />
          <Skeleton width={84} height={11} />
        </div>
      </div>

      <div>
        <div className={styles.triangle}>
          {[0, 1, 2].map((index) => (
            <div key={index} className={styles.tri}>
              <Skeleton width={38} height={10} />
              <Skeleton width="80%" height={30} />
            </div>
          ))}
        </div>
        <div className={styles.list}>
          {Array.from({ length: rowCount }).map((_, index) => (
            <div key={index} className={styles.row}>
              <Skeleton width={64} height={13} />
              <Skeleton width="42%" height={13} />
            </div>
          ))}
        </div>
      </div>

      <Skeleton height={148} />

      {tagCount > 0 ? (
        <div className={styles.tags}>
          {Array.from({ length: tagCount }).map((_, index) => (
            <Skeleton
              key={index}
              width={TAG_WIDTHS[index % TAG_WIDTHS.length]}
              height={30}
              radius={999}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { ExifPanelSkeleton };
