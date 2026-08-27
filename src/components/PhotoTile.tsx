"use client";

import Image from "next/image";
import Link from "next/link";

import { PHOTO_GRID_IMAGE_SIZES } from "@/constants/breakpoints";
import { DETAIL_QUERY_KEYS } from "@/constants/routes";
import { pickText } from "@/lib/i18n/pick-text";
import { openDetailQuery } from "@/lib/navigation/detail-query-url";


import { imagePreviewUrl } from "@/types/image";

import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Lang } from "@/types/lang";

import styles from "./PhotoTile.module.css";

type Props = {
  photo: GalleryPhoto;
  lang: Lang;
  square?: boolean;
  /** LCP 보호 — 상단(첫 화면)에 오는 타일만 eager 로드 */
  priority?: boolean;
  /** hover/focus/터치 시작 시 상세 모달 리소스 프리로드 */
  onPreload?: () => void;
};

/**
 * 사진 타일 — 클릭 시 ?photo= 딥링크(상세 모달). 호버 시 제목·노출값 오버레이.
 *
 * @param {Props} props
 * @param {GalleryPhoto} props.photo
 * @param {Lang} props.lang
 * @param {boolean | undefined} props.square
 * @param {boolean | undefined} props.priority - LCP 보호 — 상단(첫 화면)에 오는 타일만 eager 로드
 * @param {(() => void) | undefined} props.onPreload - hover/focus/터치 시작 시 상세 모달 리소스 프리로드
 * @returns {JSX.Element}
 */
const PhotoTile = ({ photo, lang, square = false, priority = false, onPreload }: Props) => {
  const title = pickText(photo.title, lang);
  const meta = `${photo.exif.aperture} · ${photo.exif.shutter} · ISO${photo.exif.iso} · ${photo.exif.focalLength}`;

  return (
    <Link
      href={{ query: { photo: photo.id } }}
      scroll={false}
      prefetch={false}
      aria-label={title}
      className={styles.tile}
      data-cursor-large="frame"
      data-protected-image
      style={{ aspectRatio: square ? "1 / 1" : `${photo.aspectRatio}` }}
      onPointerEnter={onPreload}
      onPointerDown={onPreload}
      onFocus={onPreload}
      onClick={(event) => {
        // 수정키·중클릭은 링크의 새 탭/새 창 동작을 보존하고 일반 좌클릭만 빠르게 연다.
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        openDetailQuery(DETAIL_QUERY_KEYS.photo, photo.id);
      }}
    >
      <Image
        src={imagePreviewUrl(photo.image)}
        alt={title}
        fill
        priority={priority}
        sizes={PHOTO_GRID_IMAGE_SIZES}
        className={styles.photo}
        draggable={false}
      />
      <span className={styles.ov}>
        <span className={styles.t}>{title}</span>
        <span className={styles.m}>{meta}</span>
      </span>
    </Link>
  );
};

export { PhotoTile };
