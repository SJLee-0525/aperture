"use client";

import { useId } from "react";

import { Modal } from "@/components/Modal";
import { TimelineList } from "@/components/TimelineList";
import { DevStackSection } from "@/features/dev/_components/DevStackSection";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

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
  const awardsHeadingId = useId();
  const { dict, lang } = useLang();
  const { active: selectedAward, open, select, close } = useQueryModal("award", config.awards);

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
        <section className={`${styles.awards} ${styles.stacked}`} aria-labelledby={awardsHeadingId}>
          <h2 id={awardsHeadingId} className={styles.sectionLabel}>
            {dict.devAwardsLabel}
          </h2>
          {config.awards.map((award) => (
            <button
              type="button"
              key={award.id}
              className={styles.awardRow}
              onClick={() => select(award.id)}
            >
              <span className={styles.awardYear}>{award.year}</span>
              <span className={styles.awardName}>{pickText(award.name, lang)}</span>
              <span className={styles.awardPlace}>{pickText(award.place, lang)}</span>
            </button>
          ))}
          <div className={styles.end} />
        </section>
      ) : null}

      <DevStackSection stack={config.stack} className={styles.stackSection} />

      <Modal
        open={open}
        onClose={close}
        closeLabel={dict.closeLabel}
        maxWidth={600}
        crumb={selectedAward ? `${dict.devAwardsLabel} · ${selectedAward.year}` : ""}
        label={selectedAward ? pickText(selectedAward.name, lang) : ""}
      >
        {selectedAward ? (
          <div>
            <div className={styles.modalYear}>{selectedAward.year}</div>
            <div className={styles.modalName}>{pickText(selectedAward.name, lang)}</div>
            <div className={styles.modalPlace}>{pickText(selectedAward.place, lang)}</div>
            <p className={styles.modalDescription}>{pickText(selectedAward.description, lang)}</p>
            {selectedAward.projectId ? (
              <LocalizedLink
                className={styles.projectLink}
                href={devProjectRoute(selectedAward.projectId)}
                prefetch={false}
              >
                {dict.devAwardProjectLink} <span aria-hidden="true">↗</span>
              </LocalizedLink>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </main>
  );
};

export { DevCareerView };
