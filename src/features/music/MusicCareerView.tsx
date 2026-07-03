"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import { TimelineList } from "@/components/TimelineList";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicAward, MusicConfig } from "@/types/music";
import type { TimelineEntry } from "@/types/timeline";

import styles from "./MusicCareerView.module.css";

type Props = { config: MusicConfig; awards: MusicAward[] };

/** 경력 (/music/career) — 학력 + 경력 타임라인 + 수상(클릭 시 상세 모달). */
const MusicCareerView = ({ config, awards }: Props) => {
  const { dict, lang } = useLang();
  const [selected, setSelected] = useState<MusicAward | null>(null);

  const toRows = (entries: TimelineEntry[]) =>
    entries.map((entry) => ({ period: entry.period, text: pickText(entry.title, lang) }));

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicCareerNav}</h1>

      <TimelineList label={dict.musicEducationLabel} rows={toRows(config.education)} />
      <TimelineList
        label={dict.musicCareerNav}
        rows={toRows(config.career)}
        className={styles.stacked}
      />

      <section className={styles.awards}>
        <div className={styles.awLabel}>{dict.musicAwardsNav}</div>
        {awards.map((award) => (
          <button
            type="button"
            key={award.id}
            className={styles.row}
            onClick={() => setSelected(award)}
          >
            <span className={styles.yr}>{award.year}</span>
            <span className={styles.an}>{pickText(award.name, lang)}</span>
            <span className={styles.ap}>{award.place}</span>
          </button>
        ))}
        <div className={styles.awEnd} />
      </section>

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        maxWidth={600}
        crumb={selected ? `${dict.musicAwardsNav} · ${selected.year}` : ""}
        label={selected ? pickText(selected.name, lang) : ""}
      >
        {selected ? (
          <div className={styles.award}>
            <div className={styles.ay}>{selected.year}</div>
            <div className={styles.awName}>{pickText(selected.name, lang)}</div>
            <div className={styles.awPlace}>{selected.place}</div>
            <p className={styles.ad}>{pickText(selected.description, lang)}</p>
          </div>
        ) : null}
      </Modal>
    </main>
  );
};

export { MusicCareerView };
