import { Skeleton } from "@/components/Skeleton";

import styles from "./PublicPageSkeletons.module.css";

const GRID_CONFIG = {
  poster: { count: 3, aspectRatio: 0.75, gridClass: styles.posterGrid, showInfo: true },
  project: { count: 4, aspectRatio: 16 / 9, gridClass: styles.projectGrid, showInfo: true },
  media: { count: 4, aspectRatio: 16 / 9, gridClass: styles.mediaGrid, showInfo: false },
} as const;

const TIMELINE_SECTIONS = [3, 4, 3];
const STACK_GROUPS = [5, 4, 6, 3];
const CHIP_WIDTHS = [76, 104, 88, 120, 68, 96];
const ABOUT_LINES = ["100%", "92%", "64%"];
const ABOUT_ROW_WIDTHS = ["78%", "64%", "70%", "52%"];
const SEARCH_GROUPS = [4, 3, 3];
const CONTACT_SOCIAL_WIDTHS = [112, 96, 124];

type GridKind = keyof typeof GRID_CONFIG;

const PageTitleSkeleton = () => (
  <div className={styles.titleSlot}>
    <Skeleton width={150} height={34} />
  </div>
);

const CardGridPageSkeleton = ({ kind }: { kind: GridKind }) => {
  const config = GRID_CONFIG[kind];

  return (
    <main className={styles.main} aria-busy="true">
      <PageTitleSkeleton />
      <div className={`${styles.cardGrid} ${config.gridClass}`}>
        {Array.from({ length: config.count }).map((_, index) => (
          <div key={`${kind}-${index}`}>
            <Skeleton aspectRatio={config.aspectRatio} />
            {config.showInfo ? (
              <div className={styles.cardInfo}>
                <Skeleton width="72%" height={18} />
                <Skeleton width="48%" height={12} radius={0} />
                {kind === "project" ? <Skeleton width="92%" height={12} radius={0} /> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
};

/**
 * 기술 스택 자리표시자 — `DevStackSection` 의 규격을 그대로 미러한다.
 *
 * 제목 자리와 상단 여백을 빼먹으면 로딩 화면이 본문보다 100px 넘게 위에 놓여, 데이터가
 * 도착하는 순간 지면 전체가 아래로 밀린다. 칩 높이·모서리와 마지막 그룹의 구분선 유무도
 * 실제 규격을 따른다.
 *
 * @returns {JSX.Element}
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

/**
 * 학력·경력·수상 타임라인 자리표시자.
 *
 * @param {{ withStack?: boolean }} props
 * @param {boolean | undefined} props.withStack - 경력 페이지처럼 타임라인 아래 기술 스택 칩 그룹이 이어질 때 켠다.
 * @returns {JSX.Element}
 */
const TimelinePageSkeleton = ({ withStack = false }: { withStack?: boolean }) => (
  <main className={styles.main} aria-busy="true">
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

const AboutPageSkeleton = ({ extended = false }: { extended?: boolean }) => (
  <main className={styles.about} aria-busy="true">
    <header className={styles.aboutHero}>
      <Skeleton width={92} height={18} />
      <Skeleton className={styles.aboutTitle} width="70%" height={56} />
      <div className={styles.aboutCopy}>
        {ABOUT_LINES.map((width, index) => (
          <Skeleton key={`about-copy-${index}`} width={width} height={16} />
        ))}
      </div>
    </header>

    <div className={styles.stats}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`stat-${index}`} className={styles.stat}>
          <Skeleton width={64} height={36} />
          <Skeleton width={72} height={10} />
        </div>
      ))}
    </div>

    <div className={styles.aboutColumns}>
      {Array.from({ length: 2 }).map((_, columnIndex) => (
        <div key={`about-column-${columnIndex}`}>
          <Skeleton width={72} height={11} />
          <div className={styles.aboutList}>
            {ABOUT_ROW_WIDTHS.map((width, rowIndex) => (
              <Skeleton key={`about-${columnIndex}-${rowIndex}`} width={width} height={14} />
            ))}
          </div>
        </div>
      ))}
    </div>

    {extended ? (
      <div className={styles.qa}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`qa-${index}`} className={styles.qaItem}>
            <Skeleton width="54%" height={19} />
            <Skeleton width="100%" height={14} radius={0} />
            <Skeleton width="82%" height={14} radius={0} />
          </div>
        ))}
      </div>
    ) : null}
  </main>
);

const SearchPageSkeleton = () => (
  <main className={styles.search} aria-busy="true">
    <PageTitleSkeleton />
    <div className={styles.searchGroups}>
      {SEARCH_GROUPS.map((rowCount, groupIndex) => (
        <section key={`search-${groupIndex}`} className={styles.searchGroup}>
          <Skeleton width={64} height={11} />
          <div className={styles.searchRows}>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div key={`search-${groupIndex}-${rowIndex}`} className={styles.searchRow}>
                <Skeleton width={64} height={48} radius={0} />
                <div className={styles.searchCopy}>
                  <Skeleton width={rowIndex % 2 === 0 ? "68%" : "52%"} height={16} />
                  <Skeleton width="32%" height={11} radius={0} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  </main>
);

const ContactPageSkeleton = () => (
  <main className={styles.contact} aria-busy="true">
    <header className={styles.contactHead}>
      <Skeleton width={92} height={18} />
      <Skeleton className={styles.contactTitle} width="48%" height={56} />
      <div className={styles.contactLead}>
        <Skeleton width="76%" height={16} />
        <Skeleton width="58%" height={16} />
      </div>
    </header>

    <div className={styles.contactSocials}>
      {CONTACT_SOCIAL_WIDTHS.map((width, index) => (
        <Skeleton key={`contact-social-${index}`} width={width} height={42} radius={0} />
      ))}
    </div>

    <div className={styles.contactForm}>
      <div className={styles.contactGrid}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`contact-field-${index}`} className={styles.contactField}>
            <Skeleton width={64} height={11} />
            <Skeleton height={48} radius={0} />
          </div>
        ))}
      </div>
      <div className={styles.contactField}>
        <Skeleton width={72} height={11} />
        <Skeleton height={132} radius={0} />
      </div>
      <Skeleton width={104} height={48} radius={0} />
    </div>
  </main>
);

export {
  AboutPageSkeleton,
  CardGridPageSkeleton,
  ContactPageSkeleton,
  SearchPageSkeleton,
  TimelinePageSkeleton,
};
