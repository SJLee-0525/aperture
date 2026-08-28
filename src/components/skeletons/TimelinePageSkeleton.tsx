import { Skeleton } from "@/components/Skeleton";
import { PageTitleSkeleton } from "@/components/skeletons/PageTitleSkeleton";
import { StackGroupsSkeleton } from "@/components/skeletons/StackGroupsSkeleton";

import styles from "./TimelinePageSkeleton.module.css";

const TIMELINE_SECTIONS = [3, 4, 3];

/**
 * 학력·경력·수상 타임라인 자리표시자.
 *
 * @param props.withStack 경력 페이지처럼 타임라인 아래 기술 스택 칩 그룹이 이어질 때 켠다.
 */
const TimelinePageSkeleton = ({ withStack = false }: { withStack?: boolean }) => (
  <main className="u-page-main u-loading-shell" aria-busy="true">
    <PageTitleSkeleton />
    <div className={styles.timeline}>
      {TIMELINE_SECTIONS.map((rowCount, sectionIndex) => (
        <section key={`timeline-${sectionIndex}`}>
          <Skeleton width={72} height={11} />
          <div className={styles.timelineRows}>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div key={`timeline-${sectionIndex}-${rowIndex}`} className={styles.timelineRow}>
                <Skeleton width="clamp(96px, 12vw, 150px)" height={13} radius={0} />
                <div className={styles.timelineCopy}>
                  <Skeleton width={rowIndex % 2 === 0 ? "70%" : "56%"} height={19} />
                  {sectionIndex === 1 ? <Skeleton width="88%" height={12} radius={0} /> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
    {/* 실제 화면에서도 스택은 타임라인 목록의 형제다. 안에 두면 `.timeline` 의 gap 과
        `.stackSection` 의 margin 이 겹쳐 여백이 두 번 붙는다. */}
    {withStack ? <StackGroupsSkeleton /> : null}
  </main>
);

export { TimelinePageSkeleton };
