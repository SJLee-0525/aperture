"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";

import { ExifStrip } from "@/components/ExifStrip";
import { useLang } from "@/features/lang/_hooks/use-lang";
import { ExifPanel } from "@/features/photo-detail/_components/ExifPanel";
import { ExifPanelSkeleton } from "@/features/photo-detail/_components/ExifPanelSkeleton";
import { usePhotoModal } from "@/features/photo-detail/_hooks/use-photo-modal";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { pickText } from "@/lib/i18n/pick-text";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./PhotoModal.module.css";

type Props = {
  photos: Photo[];
  tags: Tag[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

const closeIcon = (
  <svg
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);
const chevLeft = (
  <svg
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const chevRight = (
  <svg
    viewBox="0 0 24 24"
    width="17"
    height="17"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/**
 * 사진 상세 — 데스크톱 라이트박스 / 모바일 바텀시트(탭으로 peek↔확장).
 * document.body로 포털 렌더 → sticky 헤더 등 어떤 조상 스태킹 컨텍스트에도 안 갇히고 항상 최상단.
 * AnimatePresence로 열림/닫힘 페이드+스케일(exit 포함). URL(?photo=)이 열림 상태의 단일 출처.
 */
const PhotoModal = ({ photos, tags }: Props) => {
  const { dict, lang } = useLang();
  const { photo, open, close, next, prev } = usePhotoModal(photos);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [seenId, setSeenId] = useState<string | undefined>(photo?.id);
  // 사진이 바뀌면(prev/next·열기) 로더/스켈레톤을 다시 표시 — effect 없이 render-time reseed.
  if (photo && photo.id !== seenId) {
    setSeenId(photo.id);
    setImgLoaded(false);
  }
  const trapRef = useFocusTrap(open);
  const mounted = useMounted();
  useScrollLock(open);

  const alt = photo ? pickText(photo.title, lang) : "";
  const tagLabels = photo
    ? photo.tags.map((id) => {
        const found = tags.find((tag) => tag.id === id);
        return found ? pickText(found, lang) : id;
      })
    : [];

  const onPanelClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    setExpanded((value) => !value);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && photo ? (
        <m.div
          key="photo-modal"
          ref={trapRef}
          tabIndex={-1}
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className={styles.scrim}
            aria-label={dict.closeLabel}
            onClick={close}
          />
          <m.div
            className={styles.inner}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <div className={styles.photo}>
              <Image
                key={photo.id}
                src={photo.image.url}
                alt={alt}
                fill
                sizes="100vw"
                className={styles.img}
                priority
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
              />
              {imgLoaded ? null : (
                <div className={styles.imgLoader} aria-hidden="true">
                  <span className={styles.spinner} />
                </div>
              )}
              {imgLoaded ? (
                <div className={styles.strip}>
                  <ExifStrip
                    aperture={photo.exif.aperture}
                    shutter={photo.exif.shutter}
                    iso={photo.exif.iso}
                    glass
                  />
                </div>
              ) : null}
              <button
                type="button"
                className={`${styles.nav} ${styles.close}`}
                aria-label={dict.closeLabel}
                onClick={close}
              >
                {closeIcon}
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                aria-label={dict.previousImageLabel}
                onClick={prev}
              >
                {chevLeft}
              </button>
              <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                aria-label={dict.nextImageLabel}
                onClick={next}
              >
                {chevRight}
              </button>
            </div>
            <aside
              className={`${styles.panel} ${expanded ? styles.expanded : ""}`}
              onClick={onPanelClick}
            >
              <span className={styles.handle} />
              {imgLoaded ? (
                <ExifPanel photo={photo} tagLabels={tagLabels} />
              ) : (
                <ExifPanelSkeleton />
              )}
            </aside>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export { PhotoModal };
