import Image from "next/image";
import Link from "next/link";

import { pickText } from "@/lib/i18n/pick-text";
import type { Lang } from "@/types/lang";
import type { Photo } from "@/types/photo";

import styles from "./PhotoTile.module.css";

type Props = {
  photo: Photo;
  lang: Lang;
  square?: boolean;
  /** LCP 보호 — 상단(첫 화면)에 오는 타일만 eager 로드 */
  priority?: boolean;
};

/** 사진 타일 — 클릭 시 ?photo= 딥링크(상세 모달). 호버 시 제목·노출값 오버레이. */
const PhotoTile = ({ photo, lang, square = false, priority = false }: Props) => {
  const title = pickText(photo.title, lang);
  const meta = `${photo.exif.aperture} · ${photo.exif.shutter} · ISO${photo.exif.iso} · ${photo.exif.focalLength}`;

  return (
    <Link
      href={{ query: { photo: photo.id } }}
      scroll={false}
      aria-label={title}
      className={styles.tile}
      style={{ aspectRatio: square ? "1 / 1" : `${photo.aspectRatio}` }}
    >
      <Image
        src={photo.image.url}
        alt={title}
        fill
        priority={priority}
        sizes="(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 25vw"
        className={styles.photo}
      />
      <span className={styles.ov}>
        <span className={styles.t}>{title}</span>
        <span className={styles.m}>{meta}</span>
      </span>
    </Link>
  );
};

export { PhotoTile };
