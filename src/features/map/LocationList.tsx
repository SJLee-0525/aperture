"use client";

import Image from "next/image";
import Link from "next/link";

import { useLang } from "@/features/lang/use-lang";
import { formatCoords } from "@/lib/format/format-coords";
import { pickText } from "@/lib/i18n/pick-text";
import type { Photo } from "@/types/photo";

import styles from "./LocationList.module.css";

type Props = {
  photos: Photo[];
};

/** 촬영 위치 리스트 — 클릭 시 ?photo= 딥링크로 상세 모달. (실제 지도 연동 전에도 기능함) */
const LocationList = ({ photos }: Props) => {
  const { dict, lang } = useLang();

  return (
    <aside className={styles.list}>
      <div className={styles.head}>
        <span className="u-label">{dict.locationsLabel}</span>
        <span className={styles.count}>{photos.length} spots</span>
      </div>
      {photos.map((photo) => (
        <Link
          key={photo.id}
          href={{ query: { photo: photo.id } }}
          scroll={false}
          className={styles.item}
        >
          <span className={styles.thumb}>
            <Image
              src={photo.image.url}
              alt={pickText(photo.place, lang)}
              fill
              sizes="46px"
              className={styles.thumbImg}
            />
          </span>
          <span className={styles.txt}>
            <span className={styles.place}>{pickText(photo.place, lang)}</span>
            {photo.coords ? <span className={styles.co}>{formatCoords(photo.coords)}</span> : null}
          </span>
        </Link>
      ))}
    </aside>
  );
};

export { LocationList };
