"use client";

import { useState } from "react";

import { YouTubeFacade } from "@/components/YouTubeFacade";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { pickText } from "@/lib/i18n/pick-text";

import type { MusicMedia } from "@/types/music";

import styles from "./MusicMediaView.module.css";

/**
 * 영상 (/music/media) — facade 클릭 시 YouTube iframe 재생.
 *
 * 재생 상태를 목록이 들고 있어 한 번에 하나만 재생된다. facade 가 각자 상태를 가지면
 * 두 영상의 소리가 겹친다. 아직 영상 ID 가 없는 항목은 눌렀을 때 출처 자리에 "곧 공개"를 보여 준다.
 *
 * @param {{ media: MusicMedia[] }} props
 * @param {MusicMedia[]} props.media
 * @returns {JSX.Element}
 */
const MusicMediaView = ({ media }: { media: MusicMedia[] }) => {
  const { dict, lang } = useLang();
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <main className="u-page-main">
      <h1 className={styles.title}>{dict.musicMediaNav}</h1>
      {media.length === 0 ? (
        <p className={styles.empty}>{dict.comingSoon}</p>
      ) : (
        <div className={styles.vid}>
          {media.map((item) => {
            const pending = playing === item.id && !item.youtubeId;
            return (
              <YouTubeFacade
                key={item.id}
                videoId={item.youtubeId}
                title={pickText(item.title, lang)}
                source={pending ? dict.comingSoon : pickText(item.source, lang)}
                playing={playing === item.id}
                onPlay={() => setPlaying(item.id)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
};

export { MusicMediaView };
