"use client";

import { Modal } from "@/components/Modal";
import { TimelineList } from "@/components/TimelineList";
import { devProjectRoute } from "@/constants/routes";
import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { useQueryModal } from "@/hooks/use-query-modal";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevConfig } from "@/types/dev";

import styles from "./DevCareerView.module.css";

/** 경력 (/dev/career) — 학력·경력 타임라인 + 수상 상세. */
const DevCareerView = ({ config }: { config: DevConfig }) => {
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
        <section className={`${styles.awards} ${styles.stacked}`}>
          <div className={styles.sectionLabel}>{dict.devAwardsLabel}</div>
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
