"use client";

import { m } from "motion/react";
import { useMemo } from "react";

import { CountUp } from "@/components/CountUp";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicAward, MusicConfig, MusicMedia, MusicWork } from "@/types/music";

import styles from "./MusicAboutView.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
/** 블록이 순번대로 아래에서 떠오름 (custom = 순번). */
const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.1 },
  }),
};

/** eyebrow 역할 라벨 — 사이트 태그라인 규칙상 언어 무관(고정). */
const EYEBROW = "Pianist";

type Props = {
  config: MusicConfig;
  works: MusicWork[];
  awards: MusicAward[];
  media: MusicMedia[];
};

/** 음악 소개 — intro 요약 헤드라인·본문 + 통계(연주/수상/영상/무대) + 레퍼토리·무대·장르(연주에서 파생). */
const MusicAboutView = ({ config, works, awards, media }: Props) => {
  const { dict, lang } = useLang();

  // intro 첫 문장 = 요약 헤드라인, 나머지 = 본문 (사진 소개와 동일 패턴)
  const [summary, body] = useMemo(() => {
    const text = pickText(config.intro, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [config.intro, lang]);

  // 레퍼토리(작곡가 = subtitle "슈베르트 · D.911" 앞부분)·무대·장르
  const composers = useMemo(
    () => [
      ...new Set(
        works.map((work) => pickText(work.subtitle, lang).split("·")[0].trim()).filter(Boolean),
      ),
    ],
    [works, lang],
  );
  const venues = useMemo(
    () => [...new Set(works.map((work) => pickText(work.venue, lang)))],
    [works, lang],
  );
  const genres = useMemo(
    () => [...new Set(works.map((work) => pickText(work.category, lang)))],
    [works, lang],
  );

  const stats: Array<[number, string]> = [
    [works.length, "WORKS"],
    [awards.length, "AWARDS"],
    [media.length, "VIDEOS"],
    [venues.length, "STAGES"],
  ];
  const columns: Array<[string, string[]]> = [
    [dict.musicRepertoireLabel, composers],
    [dict.musicVenuesLabel, venues],
    [dict.musicGenresLabel, genres],
  ];

  return (
    <main className={styles.about}>
      <m.header
        className={styles.hero}
        custom={0}
        variants={FADE_UP}
        initial="hidden"
        animate="show"
      >
        <p className={styles.eyebrow}>{EYEBROW}</p>
        <h1 className={styles.name}>{summary}</h1>
        {body ? <p className={styles.bio}>{body}</p> : null}
      </m.header>

      <m.div className={styles.stats} custom={1} variants={FADE_UP} initial="hidden" animate="show">
        {stats.map(([value, label]) => (
          <div key={label}>
            <div className={styles.sn}>
              <CountUp value={value} />
            </div>
            <div className={styles.sl}>{label}</div>
          </div>
        ))}
      </m.div>

      <m.div className={styles.cols} custom={2} variants={FADE_UP} initial="hidden" animate="show">
        {columns.map(([label, items]) => (
          <div key={label}>
            <div className="u-label">{label}</div>
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </m.div>
    </main>
  );
};

export { MusicAboutView };
