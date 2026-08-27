"use client";

import { AwardDetailModal } from "@/components/AwardDetailModal";
import { AwardList } from "@/components/AwardList";
import { TimelineList } from "@/components/TimelineList";
import { DevStackSection } from "@/features/dev/_components/DevStackSection";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { useDevAwardTools } from "@/features/dev/_hooks/use-dev-tools";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";

import { devProjectRoute } from "@/constants/routes";
import { pickText } from "@/lib/i18n/pick-text";

import type { DevConfig } from "@/types/dev";

import styles from "./DevCareerView.module.css";

/**
 * 경력 (/dev/career) — 학력·경력 타임라인, 수상 상세와 기술 스택을 한 페이지에 모은다.
 * 시간순 이력(h1 「경력」)을 먼저 보여주고 역량 요약(h2 「기술」)을 뒤에 둔다. 두 제목은 같은 크기·서체라
 * 한 페이지 안에서 대등한 두 묶음으로 읽힌다. 네비게이션은 둘을 합쳐 「경력·기술」로 안내한다.
 * 수상 행은 `?award=` 딥링크 모달을 열며, 뒤로가기로 닫히는 계약은 `useQueryModal` 이 담당한다.
 * 비어 있는 항목(학력·경력·수상·스택)은 각각 렌더하지 않아 빈 라벨만 남지 않게 한다.
 *
 * @param {{ config: DevConfig }} props
 * @param {DevConfig} props.config - education·timeline·awards·stack 을 소비한다. 나머지 필드는 소개 페이지 소관이다.
 * @returns {JSX.Element}
 */
const DevCareerView = ({ config }: { config: DevConfig }) => {
  const { dict, lang } = useLang();
  const { active: selectedAward, open, select, close } = useQueryModal("award", config.awards);
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useDevAwardTools(config.awards);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.devCareerNav}</h1>

      {config.education.length > 0 ? (
        <TimelineList
          label={dict.devEducationLabel}
          rows={config.education.map((entry, index) => ({
            id: `education-${index}`,
            period: entry.period,
            text: pickText(entry.title, lang),
          }))}
        />
      ) : null}

      {config.timeline.length === 0 ? (
        <p className={`${styles.empty} ${styles.stacked}`}>{dict.comingSoon}</p>
      ) : (
        <TimelineList
          label={dict.devCareerNav}
          className={styles.stacked}
          rows={config.timeline.map((entry) => ({
            period: entry.period,
            text: pickText(entry.title, lang),
            detail: (
              <>
                <span className={styles.rr}>{pickText(entry.role, lang)}</span>
                <span className={styles.rd}>{pickText(entry.desc, lang)}</span>
              </>
            ),
          }))}
        />
      )}

      {config.awards.length > 0 ? (
        <AwardList
          label={dict.devAwardsLabel}
          awards={config.awards.map((award) => ({
            id: award.id,
            year: award.year,
            name: pickText(award.name, lang),
            place: pickText(award.place, lang),
          }))}
          onSelect={select}
        />
      ) : null}

      <DevStackSection stack={config.stack} className={styles.stackSection} />

      <AwardDetailModal
        award={
          selectedAward
            ? {
                year: selectedAward.year,
                name: pickText(selectedAward.name, lang),
                place: pickText(selectedAward.place, lang),
                description: pickText(selectedAward.description, lang),
              }
            : null
        }
        label={dict.devAwardsLabel}
        closeLabel={dict.closeLabel}
        open={open}
        onClose={close}
      >
        {selectedAward?.projectId ? (
          <LocalizedLink
            className={styles.projectLink}
            href={devProjectRoute(selectedAward.projectId)}
            prefetch={false}
          >
            {dict.devAwardProjectLink} <span aria-hidden="true">↗</span>
          </LocalizedLink>
        ) : null}
      </AwardDetailModal>
    </main>
  );
};

export { DevCareerView };
