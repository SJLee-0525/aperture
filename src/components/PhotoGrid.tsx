"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { PhotoTile } from "@/components/PhotoTile";
import type { GalleryPhoto } from "@/types/gallery-photo";
import type { Lang } from "@/types/lang";

import styles from "./PhotoGrid.module.css";

type Props = {
  photos: GalleryPhoto[];
  lang: Lang;
  square: boolean;
  emptyLabel: string;
  /** 타일 hover/focus 시 상세 모달 리소스 프리로드 */
  onTilePreload?: () => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const columnCountFor = (width: number) => (width <= 760 ? 2 : width <= 1100 ? 3 : 4);

/**
 * 사진 그리드 — 행 우선 메이슨리 또는 정사각(grid).
 * CSS columns의 열 우선 흐름과 무한 로딩 재배치를 피하려고 현재 열 수에 맞춰 안정적으로 분배한다.
 * 필터 변경 시 항목이 fade+scale 로 들고 나고(AnimatePresence), 남은 항목은 layout 으로 재배치된다.
 * 뷰 토글(메이슨리↔정사각) 시에도 layout 이 타일 크기·위치 변화를 부드럽게 잇는다.
 * initial={false} — 최초 로드는 애니메이션 없이 즉시(LCP 보호, 페이지 전환 페이드로 충분).
 */
const PhotoGrid = ({ photos, lang, square, emptyLabel, onTilePreload }: Props) => {
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const sync = () => setColumnCount(columnCountFor(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const columns = useMemo(() => {
    const distributed: Array<Array<{ photo: GalleryPhoto; index: number }>> = Array.from(
      { length: columnCount },
      () => [],
    );
    photos.forEach((photo, index) => {
      distributed[index % columnCount].push({ photo, index });
    });
    return distributed;
  }, [photos, columnCount]);

  const tile = (photo: GalleryPhoto, index: number) => (
    <m.div
      key={photo.id}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{
        duration: 0.32,
        ease: EASE,
        layout: { duration: 0.45, ease: EASE },
      }}
      data-photo-index={index}
    >
      <PhotoTile
        photo={photo}
        lang={lang}
        square={square}
        priority={index < 4}
        onPreload={onTilePreload}
      />
    </m.div>
  );

  return (
    <>
      {square ? (
        <div className={styles.square}>
          <AnimatePresence mode="popLayout" initial={false}>
            {photos.map(tile)}
          </AnimatePresence>
        </div>
      ) : (
        <div className={styles.mason}>
          {columns.map((column, index) => (
            <div className={styles.column} key={index}>
              <AnimatePresence initial={false}>
                {column.map(({ photo, index: photoIndex }) => tile(photo, photoIndex))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {photos.length === 0 ? (
          <m.p
            key="empty"
            className={styles.empty}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {emptyLabel}
          </m.p>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export { PhotoGrid };
