"use client";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicMedia } from "@/types/music";

import styles from "./MusicMediaView.module.css";

const PLAY_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/** 영상 (/music/media) — YouTube facade. iframe 재생은 B1-b. */
const MusicMediaView = ({ media }: { media: MusicMedia[] }) => {
  const { dict, lang } = useLang();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicMediaNav}</h1>
      {media.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.vid}>
          {media.map((item) => (
            <div key={item.id} className={styles.v}>
              <div className={styles.facade}>
                <div className={styles.vt}>{pickText(item.title, lang)}</div>
                <div className={styles.vs}>{pickText(item.source, lang)}</div>
              </div>
              <div className={styles.play}>{PLAY_ICON}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export { MusicMediaView };
