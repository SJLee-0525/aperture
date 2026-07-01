"use client";

import Image from "next/image";
import Link from "next/link";

import { PhotoGrid } from "@/components/PhotoGrid";
import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/use-lang";
import { PhotoModal } from "@/features/photo-detail/PhotoModal";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./AlbumDetailView.module.css";

type Props = {
  album: Album;
  photos: Photo[];
  coverUrl: string;
  tags: Tag[];
};

/** 앨범 상세 — 히어로(커버+제목) + 메이슨리 그리드 + 상세 모달(앨범 내 순환). */
const AlbumDetailView = ({ album, photos, coverUrl, tags }: Props) => {
  const { dict, lang } = useLang();
  const title = pickText(album.title, lang);

  return (
    <>
      <div className={styles.hero}>
        <Image src={coverUrl} alt={title} fill sizes="100vw" className={styles.heroImg} priority />
        <div className={styles.scrim} />
        <Link href={ROUTES.ALBUMS} className={styles.back}>
          ← {dict.albumsNav}
        </Link>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{title}</h1>
          <div className={styles.heroMeta}>
            {pickText(album.subtitle, lang)} · {photos.length} photos
          </div>
        </div>
      </div>

      <main className={styles.main}>
        <PhotoGrid photos={photos} lang={lang} square={false} emptyLabel={dict.emptyResults} />
      </main>

      <PhotoModal photos={photos} tags={tags} />
    </>
  );
};

export { AlbumDetailView };
