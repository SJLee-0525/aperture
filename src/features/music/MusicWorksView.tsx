"use client";

import Image from "next/image";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicWork } from "@/types/music";

import styles from "./MusicWorksView.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

/** 연주 목록 (/music) — 포스터 그리드. 사진 섹션처럼 개별 페이지. */
const MusicWorksView = ({ works }: { works: MusicWork[] }) => {
  const { dict, lang } = useLang();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicWorksNav}</h1>
      {works.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.works}>
          {works.map((work) => (
            <figure key={work.id} className={styles.work}>
              <div className={styles.poster}>
                {work.poster.url ? (
                  <Image
                    src={work.poster.url}
                    alt={pickText(work.title, lang)}
                    fill
                    sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
                    className={styles.posterImg}
                  />
                ) : (
                  "POSTER"
                )}
                <span className={styles.tag}>{pickText(work.category, lang)}</span>
              </div>
              <div className={styles.wt}>{pickText(work.title, lang)}</div>
              <div className={styles.ws}>{pickText(work.subtitle, lang)}</div>
              <div className={styles.wm}>
                {ymd(work.performedAt)} · {pickText(work.venue, lang)}
              </div>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
};

export { MusicWorksView };
