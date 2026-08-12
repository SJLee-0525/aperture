import { Skeleton } from "@/components/Skeleton";

import styles from "./ArticlesListSkeleton.module.css";

/** 태그 칩 자리 — 사전 길이가 제각각이라 폭을 섞어 실제 줄과 비슷하게 둔다. */
const CHIP_WIDTHS = [48, 72, 60, 84];
const CARD_COUNT = 4;

/**
 * 블로그 목록의 RSC 대기 화면. 툴바·태그 칩 행·카드 그리드를 실제 셸과 같은 자리에 둔다.
 *
 * 치수는 사진 작업 목록 스켈레톤과 맞춘다 — 두 지면이 같은 툴바 컴포넌트를 쓰므로 값이
 * 어긋나면 로딩에서 본문으로 넘어갈 때 첫 줄이 흔들린다.
 *
 * @returns {JSX.Element}
 */
const ArticlesListSkeleton = () => (
  <main className={styles.main} aria-busy="true">
    <div className={styles.toolbar}>
      <Skeleton width={76} height={32} />
      <div className={styles.tools}>
        <Skeleton width={64} height={16} />
        <Skeleton width={84} height={37} />
      </div>
    </div>

    <div className={styles.tagbar}>
      {CHIP_WIDTHS.map((width) => (
        <Skeleton key={width} width={width} height={30} radius={999} />
      ))}
    </div>

    <div className={styles.grid}>
      {Array.from({ length: CARD_COUNT }, (_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton aspectRatio={16 / 9} />
          <div className={styles.body}>
            <Skeleton width="72%" height={20} />
            <Skeleton width="100%" height={14} />
            <Skeleton width={140} height={11} />
          </div>
        </div>
      ))}
    </div>
  </main>
);

export { ArticlesListSkeleton };
