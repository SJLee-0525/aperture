"use client";

import { AlbumCard } from "@/components/AlbumCard";
import { albumRoute } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

import styles from "./AlbumsView.module.css";

type Props = {
  albums: Album[];
  photos: Photo[];
};

/** 앨범 그리드 — 커버는 각 앨범의 coverPhotoId를 사진에서 해석. */
const AlbumsView = ({ albums, photos }: Props) => {
  const { dict, lang } = useLang();

  const coverUrlOf = (album: Album) =>
    photos.find((photo) => photo.id === album.coverPhotoId)?.image.url ??
    photos[0]?.image.url ??
    "";

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{dict.albumsNav}</h1>
      <div className={styles.grid}>
        {albums.map((album) => {
          const title = pickText(album.title, lang);
          return (
            <AlbumCard
              key={album.id}
              href={albumRoute(album.id)}
              coverUrl={coverUrlOf(album)}
              coverAlt={title}
              count={album.photoIds.length}
              title={title}
              subtitle={pickText(album.subtitle, lang)}
            />
          );
        })}
      </div>
    </main>
  );
};

export { AlbumsView };
