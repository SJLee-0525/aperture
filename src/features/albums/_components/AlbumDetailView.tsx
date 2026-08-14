"use client";

import { m } from "motion/react";

import { DetailHero } from "@/components/DetailHero";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoModal } from "@/features/photo-detail/_components/PhotoModal";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { ROUTES } from "@/constants/routes";
import { localizePath } from "@/lib/i18n/locale-path";
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
 *
 * @param {Props} props
 * @param {Album} props.album
 * @param {Photo[]} props.photos
 * @param {string | null} props.coverUrl
 * @param {Tag[]} props.tags
 * @returns {JSX.Element}
 */
const AlbumDetailView = ({ album, photos, coverUrl, tags }: Props) => {
  const { dict, lang } = useLang();
  const title = pickText(album.title, lang);

  return (
    <>
      <DetailHero
        cover={coverUrl ? { url: coverUrl, alt: title } : null}
        back={{ href: localizePath(lang, ROUTES.PHOTO_ALBUMS), label: dict.albumsNav }}
        share={{ title, label: dict.shareLabel }}
      >
        {/* 커버 유무를 글자색에 전달한다. DetailHero 는 커버가 없으면 scrim 을 걷고 밝은
            지면 배경을 칠하므로, 흰 글자를 그대로 두면 라이트 모드에서 읽히지 않는다. */}
        <div className={styles.heroText} data-variant={coverUrl ? "image" : "plain"}>
          <h1 className={styles.heroTitle}>{title}</h1>
          <div className={styles.heroMeta}>
            {pickText(album.subtitle, lang)} · {photos.length} photos
          </div>
        </div>
      </DetailHero>

      <m.main
        className={styles.main}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
      >
        <PhotoGrid photos={photos} lang={lang} square={false} emptyLabel={dict.emptyResults} />
      </m.main>

      <PhotoModal photos={photos} tags={tags} chatTarget />
    </>
  );
};

export { AlbumDetailView };
