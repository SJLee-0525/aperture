"use client";

import { useState } from "react";

import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { MusicMedia } from "@/types/music";

import styles from "./MusicMediaView.module.css";

const PLAY_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/** 영상 (/music/media) — facade 클릭 시 YouTube iframe 재생. id 없는 항목(mock)은 "곧 공개" 안내. */
const MusicMediaView = ({ media }: { media: MusicMedia[] }) => {
  const { dict, lang } = useLang();
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.musicMediaNav}</h1>
      {media.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.vid}>
          {media.map((item) => {
            const isPlaying = playing === item.id;
            if (isPlaying && item.youtubeId) {
              return (
                <div key={item.id} className={styles.v}>
                  <iframe
                    className={styles.frame}
                    src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1`}
                    title={pickText(item.title, lang)}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              );
            }
            return (
              <div key={item.id} className={styles.v}>
                <button
                  type="button"
                  className={styles.trigger}
                  onClick={() => setPlaying(item.id)}
                  aria-label={pickText(item.title, lang)}
                >
                  <div className={styles.facade}>
                    <div className={styles.vt}>{pickText(item.title, lang)}</div>
                    <div className={styles.vs}>
                      {isPlaying && !item.youtubeId ? dict.comingSoon : pickText(item.source, lang)}
                    </div>
                  </div>
                  <div className={styles.play}>{PLAY_ICON}</div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

export { MusicMediaView };
