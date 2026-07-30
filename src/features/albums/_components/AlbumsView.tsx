"use client";

import { m } from "motion/react";

import { AlbumCard } from "@/components/AlbumCard";
import { albumRoute } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import type { AlbumCard as AlbumCardData } from "@/features/albums/_lib/album-cards";
import { pickText } from "@/lib/i18n/pick-text";

import styles from "./AlbumsView.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
/** 진입 시 카드가 아래에서 살짝 떠오르며 순차 등장. */
const GRID = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const CARD = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

type Props = {
  albums: AlbumCardData[];
};

/** 앨범 그리드 — 커버·장수는 서버에서 투영된 카드 데이터를 그대로 표시. */
const AlbumsView = ({ albums }: Props) => {
  const { dict, lang } = useLang();

  if (albums.length === 0) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>{dict.albumsNav}</h1>
        <p className={styles.empty}>{dict.emptyAlbums}</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.albumsNav}</h1>
      <m.div className={styles.grid} variants={GRID} initial="hidden" animate="show">
        {albums.map((album) => {
          const title = pickText(album.title, lang);
          return (
            <m.div key={album.id} variants={CARD}>
              <AlbumCard
                href={albumRoute(album.id)}
                coverUrl={album.coverUrl}
                coverAlt={title}
                count={album.count}
                title={title}
                subtitle={pickText(album.subtitle, lang)}
              />
            </m.div>
          );
        })}
      </m.div>
    </main>
  );
};

export { AlbumsView };
