import { Skeleton } from "@/components/Skeleton";

import styles from "./StackGroupsSkeleton.module.css";

const STACK_GROUPS = [5, 4, 6, 3];
const CHIP_WIDTHS = [76, 104, 88, 120, 68, 96];

/**
 * 기술 스택 자리표시자 — `DevStackSection` 의 규격을 그대로 미러한다.
 *
 * 제목 자리와 상단 여백을 빼먹으면 로딩 화면이 본문보다 100px 넘게 위에 놓여, 데이터가
 * 도착하는 순간 지면 전체가 아래로 밀린다. 칩 높이·모서리와 마지막 그룹의 구분선 유무도
 * 실제 규격을 따른다.
 */
const StackGroupsSkeleton = () => (
  <div className={styles.stackSection}>
    <div className={styles.stackHeading} />
    <div className={styles.stackGroups}>
      {STACK_GROUPS.map((chipCount, groupIndex) => (
        <div key={`stack-${groupIndex}`} className={styles.stackGroup}>
          <Skeleton width={104} height={21} />
          <div className={styles.chips}>
            {Array.from({ length: chipCount }).map((_, chipIndex) => (
              <Skeleton
                key={`chip-${groupIndex}-${chipIndex}`}
                width={CHIP_WIDTHS[(groupIndex + chipIndex) % CHIP_WIDTHS.length]}
                height={37}
                radius={0}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export { StackGroupsSkeleton };
