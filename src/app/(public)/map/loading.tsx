import { Skeleton } from "@/components/Skeleton";

import styles from "./loading.module.css";

const SPOT_COUNT = 7;

/** 지도 RSC fetch 동안의 스켈레톤 — MapView 셸(위치 리스트 320px + 지도 stage)을 흉내. */
export default function MapLoading() {
  return (
    <div className={styles.view}>
      <aside className={styles.list}>
        <div className={styles.head}>
          <Skeleton width={80} height={11} />
          <Skeleton width={52} height={13} />
        </div>
        {Array.from({ length: SPOT_COUNT }).map((_, index) => (
          <div key={`spot-${index}`} className={styles.item}>
            <Skeleton width={46} height={46} />
            <div className={styles.txt}>
              <Skeleton width={120} height={14} />
              <Skeleton width={88} height={10} />
            </div>
          </div>
        ))}
      </aside>
      {/* 지도 stage는 MapCanvas 로딩과 동일하게 정적 map-land 블록(펄스 없음) */}
      <div className={styles.stage} aria-hidden />
    </div>
  );
}
