"use client";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { DevConfig } from "@/types/dev";

import styles from "./DevCareerView.module.css";

/** 경력 (/dev/career) — 기간·직함·역할·설명 타임라인. */
const DevCareerView = ({ config }: { config: DevConfig }) => {
  const { dict, lang } = useLang();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.devCareerNav}</h1>
      {config.timeline.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.timeline}>
          {config.timeline.map((entry, index) => (
            <div key={`${entry.period}-${index}`} className={styles.row}>
              <div className={styles.period}>{entry.period}</div>
              <div className={styles.body}>
                <div className={styles.rt}>{pickText(entry.title, lang)}</div>
                <div className={styles.rr}>{pickText(entry.role, lang)}</div>
                <p className={styles.rd}>{pickText(entry.desc, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export { DevCareerView };
