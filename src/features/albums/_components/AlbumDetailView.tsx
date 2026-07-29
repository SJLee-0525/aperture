"use client";

import { m } from "motion/react";
import Image from "next/image";
import Link from "next/link";

import { PhotoGrid } from "@/components/PhotoGrid";
import { ROUTES } from "@/constants/routes";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { PhotoModal } from "@/features/photo-detail/_components/PhotoModal";
import { pickText } from "@/lib/i18n/pick-text";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./AlbumDetailView.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  album: Album;
  photos: Photo[];
  coverUrl: string | null;
  tags: Tag[];
};

/**
 * 앨범 상세 — 히어로(커버+제목) + 메이슨리 그리드 + 상세 모달(앨범 내 순환).
 * 진입 시: 커버가 살짝 줌아웃되며 자리잡고, 제목과 그리드가 순차로 떠오른다.
 * (모달은 body 로 포털되어 이 영역의 transform 영향을 받지 않는다.)
 */
const AlbumDetailView = ({ album, photos, coverUrl, tags }: Props) => {
  const { dict, lang } = useLang();
  const title = pickText(album.title, lang);

  return (
    <>
      <div className={styles.hero}>
        <m.div
          className={styles.heroImgWrap}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={title}
              fill
              sizes="100vw"
              className={styles.heroImg}
              priority
            />
          ) : null}
        </m.div>
        <div className={styles.scrim} />
        <Link href={ROUTES.PHOTO_ALBUMS} className={styles.back}>
          ← {dict.albumsNav}
        </Link>
        <m.div
          className={styles.heroText}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.12 }}
        >
          <h1 className={styles.heroTitle}>{title}</h1>
          <div className={styles.heroMeta}>
            {pickText(album.subtitle, lang)} · {photos.length} photos
          </div>
        </m.div>
      </div>

      <m.main
        className={styles.main}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
      >
        <PhotoGrid photos={photos} lang={lang} square={false} emptyLabel={dict.emptyResults} />
      </m.main>

      <PhotoModal photos={photos} tags={tags} />
    </>
  );
};

export { AlbumDetailView };
