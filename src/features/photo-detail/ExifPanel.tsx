"use client";

import { useLang } from "@/features/lang/use-lang";
import { LikeButton } from "@/features/likes/LikeButton";
import { DetailMiniMap } from "@/features/photo-detail/DetailMiniMap";
import { formatShotAt } from "@/lib/format/format-date";
import { pickText } from "@/lib/i18n/pick-text";
import type { Photo } from "@/types/photo";

import styles from "./ExifPanel.module.css";

type Props = {
  photo: Photo;
  /** 사전에서 해석된 태그 라벨(현재 언어) */
  tagLabels: string[];
};

/** 상세 정보 패널 — 제목·촬영일시·좋아요 + 노출 삼각 + EXIF 리스트 + 미니맵 + 태그. */
const ExifPanel = ({ photo, tagLabels }: Props) => {
  const { dict, lang } = useLang();
  const exif = photo.exif;

  const rows: Array<[string, string]> = [
    [dict.focalLabel, exif.focalLength],
    [dict.exifEv, exif.ev],
    [dict.exifWb, exif.wb],
    [dict.exifMetering, exif.metering],
    [dict.exifFlash, exif.flash],
    [dict.exifSize, `${photo.dimensions.w} × ${photo.dimensions.h}`],
    [dict.exifShotAt, formatShotAt(photo.shotAt)],
  ];
  if (photo.fileName) rows.push([dict.exifFile, photo.fileName]);

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.titleWrap}>
          <div className={styles.title}>{pickText(photo.title, lang)}</div>
          <div className={styles.date}>{formatShotAt(photo.shotAt)}</div>
        </div>
        <LikeButton key={photo.id} photoId={photo.id} initialLikes={photo.likes} />
      </div>

      <div className={styles.exif}>
        <div className={styles.exifHead}>
          <span className={styles.cam}>{photo.camera}</span>
          <span className={styles.lens}>{photo.lens}</span>
        </div>
        <div className={styles.triangle}>
          <div className={styles.tri}>
            <span className={styles.triLab}>{dict.exifAperture}</span>
            <span className={styles.triVal}>{exif.aperture}</span>
          </div>
          <div className={styles.tri}>
            <span className={styles.triLab}>{dict.exifShutter}</span>
            <span className={styles.triVal}>{exif.shutter}</span>
          </div>
          <div className={styles.tri}>
            <span className={styles.triLab}>{dict.exifIso}</span>
            <span className={styles.triVal}>{exif.iso}</span>
          </div>
        </div>
        <div className={styles.list}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.row}>
              <span className={styles.k}>{label}</span>
              <span className={styles.v}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <DetailMiniMap place={pickText(photo.place, lang)} coords={photo.coords} />

      {tagLabels.length > 0 ? (
        <div className={styles.tags}>
          {tagLabels.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { ExifPanel };
