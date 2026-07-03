"use client";

import { m } from "motion/react";
import { useMemo } from "react";

import { CountUp } from "@/components/CountUp";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";
import type { SiteConfig } from "@/types/site";

import styles from "./AboutView.module.css";

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

type Props = {
  site: SiteConfig;
  photos: Photo[];
  albums: Album[];
};

/** 소개 — 요약 헤드라인·바이오 + 통계(사진에서 자동 집계) + 카메라·렌즈·활동지역 목록.
 *  이름·연락처는 노출하지 않는다(연락은 /contact 로 일원화). 헤드라인은 bio 첫 문장에서 파생. */
const AboutView = ({ site, photos, albums }: Props) => {
  const { dict, lang } = useLang();

  // bio 첫 문장 = 요약 헤드라인, 나머지 = 본문 (관리자가 bio만 편집하면 자동 반영)
  const [summary, body] = useMemo(() => {
    const text = pickText(site.bio, lang);
    const at = text.indexOf(". ");
    return at === -1 ? [text, ""] : [text.slice(0, at), text.slice(at + 2)];
  }, [site.bio, lang]);

  const cameras = useMemo(() => [...new Set(photos.map((photo) => photo.camera))], [photos]);
  const lenses = useMemo(() => [...new Set(photos.map((photo) => photo.lens))], [photos]);
  // 활동 지역 = 장소에서 도시만 추출 (ko "도쿄 미나토구"→도쿄, en "Minato, Tokyo"→Tokyo)
  const regions = useMemo(() => {
    const cityOf = (place: Photo["place"]) => {
      const text = pickText(place, lang);
      return lang === "en" ? (text.split(",").pop() ?? text).trim() : text.split(" ")[0];
    };
    return [...new Set(photos.map((photo) => cityOf(photo.place)))];
  }, [photos, lang]);

  const stats: Array<[number, string]> = [
    [photos.length, "PHOTOS"],
    [albums.length, "ALBUMS"],
    [regions.length, "LOCATIONS"],
    [cameras.length, "BODIES"],
  ];
  const columns: Array<[string, string[]]> = [
    [dict.cameraLabel, cameras],
    [dict.lensLabel, lenses],
    [dict.regionsLabel, regions],
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
        <p className={styles.eyebrow}>Aperture.</p>
        <h1 className={styles.name}>{summary}</h1>
        {body ? <p className={styles.bio}>{body}</p> : null}
      </m.header>

      <m.div className={styles.stats} custom={1} variants={FADE_UP} initial="hidden" animate="show">
        {stats.map(([value, label]) => (
          <div key={label} className={styles.stat}>
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

export { AboutView };
