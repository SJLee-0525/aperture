"use client";

import { useMemo } from "react";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";
import type { SiteConfig } from "@/types/site";

import styles from "./AboutView.module.css";

type Props = {
  site: SiteConfig;
  photos: Photo[];
  albums: Album[];
};

/** 소개 — 이름·바이오·연락처 + 통계(사진에서 자동 집계) + 카메라·렌즈·활동지역 목록. */
const AboutView = ({ site, photos, albums }: Props) => {
  const { dict, lang } = useLang();

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
      <header className={styles.hero}>
        <h1 className={styles.name}>
          {pickText(site.name, lang)}
          <br />
          <em>— photography</em>
        </h1>
        <p className={styles.bio}>{pickText(site.bio, lang)}</p>
        <div className={styles.contact}>
          {site.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={styles.link}
              target="_blank"
              rel="noreferrer"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </header>

      <div className={styles.stats}>
        {stats.map(([value, label]) => (
          <div key={label} className={styles.stat}>
            <div className={styles.sn}>{value}</div>
            <div className={styles.sl}>{label}</div>
          </div>
        ))}
      </div>

      <div className={styles.cols}>
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
      </div>
    </main>
  );
};

export { AboutView };
