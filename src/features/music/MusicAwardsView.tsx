"use client";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicAward } from "@/types/music";

import styles from "./MusicAwardsView.module.css";

/** 수상 (/music/awards) — 연도·상명·장소. */
const MusicAwardsView = ({ awards }: { awards: MusicAward[] }) => {
  const { dict, lang } = useLang();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicAwardsNav}</h1>
      {awards.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.aw}>
          {awards.map((award) => (
            <div key={award.id} className={styles.row}>
              <div className={styles.yr}>{award.year}</div>
              <div className={styles.an}>{pickText(award.name, lang)}</div>
              <div className={styles.ap}>{award.place}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export { MusicAwardsView };
