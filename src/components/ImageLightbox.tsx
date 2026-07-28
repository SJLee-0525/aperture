"use client";

import Image from "next/image";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import type { ImageMeta } from "@/types/image";

import styles from "./ImageLightbox.module.css";

type Props = {
  images: ImageMeta[];
  index: number;
  alt: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

/**
 * 범용 이미지 라이트박스 — 캐러셀/갤러리 이미지 클릭 확대 뷰. 순수 UI(이미지 목록·인덱스만).
 * PhotoModal(사진 섹션 전용 라이트박스)과 동일한 오버레이 어휘(스크림·원형 내비)를 따르되
 * EXIF 등 도메인 결합 없이 이미지 확대만 담당한다. ESC 는 capture 단계에서 소비해
 * 아래에 열려 있는 Modal(문서 bubble 리스너)이 함께 닫히지 않게 한다.
 */
const ImageLightbox = ({ images, index, alt, onClose, onNavigate }: Props) => {
  const count = images.length;
  const containerRef = useFocusTrap(true);
  useScrollLock(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (event.key === "ArrowRight" && index < count - 1) onNavigate(index + 1);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [index, count, onClose, onNavigate]);

  if (typeof document === "undefined") return null;
  const image = images[index];
  if (!image) return null;

  return createPortal(
    <div
      className={styles.overlay}
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button type="button" className={styles.scrim} aria-label="Close" onClick={onClose} />
      <div className={styles.stage}>
        <Image
          key={image.url}
          src={image.url}
          alt={`${alt} — ${index + 1}`}
          fill
          sizes="100vw"
          className={styles.img}
          priority
        />
      </div>

      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        ×
      </button>

      {count > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            aria-label="Previous image"
            disabled={index === 0}
            onClick={() => onNavigate(index - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.nav} ${styles.next}`}
            aria-label="Next image"
            disabled={index === count - 1}
            onClick={() => onNavigate(index + 1)}
          >
            ›
          </button>
          <span className={styles.counter}>
            {index + 1} / {count}
          </span>
        </>
      ) : null}
    </div>,
    document.body,
  );
};

export { ImageLightbox };
