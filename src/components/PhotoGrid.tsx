"use client";

import { AnimatePresence, m } from "motion/react";

import { PhotoTile } from "@/components/PhotoTile";
import type { Lang } from "@/types/lang";
import type { Photo } from "@/types/photo";

import styles from "./PhotoGrid.module.css";

type Props = {
  photos: Photo[];
  lang: Lang;
  square: boolean;
  emptyLabel: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 사진 그리드 — 메이슨리(CSS columns) 또는 정사각(grid).
 * 필터 변경 시 항목이 fade+scale 로 들고 나고(AnimatePresence), 남은 항목은 layout 으로 재배치된다.
 * 뷰 토글(메이슨리↔정사각) 시에도 layout 이 타일 크기·위치 변화를 부드럽게 잇는다.
 * initial={false} — 최초 로드는 애니메이션 없이 즉시(LCP 보호, 페이지 전환 페이드로 충분).
 */
const PhotoGrid = ({ photos, lang, square, emptyLabel }: Props) => (
  <>
    <div className={square ? styles.square : styles.mason}>
      <AnimatePresence mode="popLayout" initial={false}>
        {photos.map((photo, index) => (
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
            className={styles.cell}
          >
            {/* 첫 4장은 LCP 보호 위해 priority(eager) */}
            <PhotoTile photo={photo} lang={lang} square={square} priority={index < 4} />
          </m.div>
        ))}
      </AnimatePresence>
    </div>

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

export { PhotoGrid };
