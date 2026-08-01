"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { usePullDownDismiss } from "@/hooks/use-pull-down-dismiss";
import type { ImageMeta } from "@/types/image";

import styles from "./ImageLightbox.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHROME_TRANSITION = { duration: 0.2, ease: EASE } as const;

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

type Props = {
  images: ImageMeta[];
  index: number;
  alt: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

type SlideProps = {
  item: ImageMeta;
  itemIndex: number;
  alt: string;
  loaded: boolean;
  rendered: boolean;
  onClose: () => void;
  onLoaded: (key: string) => void;
  onToggleChrome: () => void;
};

const LightboxSlide = memo(function LightboxSlide({
  item,
  itemIndex,
  alt,
  loaded,
  rendered,
  onClose,
  onLoaded,
  onToggleChrome,
}: SlideProps) {
  const itemKey = item.path || item.url;
  const itemRatio = item.w / item.h;

  return (
    <div
      className={styles.slide}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.stage}
        style={{
          width: `min(94vw, 1400px, ${88 * itemRatio}vh)`,
          aspectRatio: `${item.w} / ${item.h}`,
        }}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onClick={onToggleChrome}
      >
        {rendered ? (
          <Image
            src={item.url}
            alt={`${alt} — ${itemIndex + 1}`}
            fill
            sizes="100vw"
            className={styles.img}
            draggable={false}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
            onLoad={() => onLoaded(itemKey)}
            onError={() => onLoaded(itemKey)}
          />
        ) : null}
        {!rendered || loaded ? null : (
          <div className={styles.imgLoader} aria-hidden="true">
            <span className={styles.spinner} />
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * 범용 이미지 라이트박스 — 캐러셀/갤러리 이미지 클릭 확대 뷰. 순수 UI(이미지 목록·인덱스만).
 * PhotoModal(사진 섹션 전용 라이트박스)과 동일한 오버레이 어휘(스크림·사각 내비)를 따르되
 * EXIF 등 도메인 결합 없이 이미지 확대만 담당한다. ESC 는 capture 단계에서 소비해
 * 아래에 열려 있는 Modal(문서 bubble 리스너)이 함께 닫히지 않게 한다.
 */
const ImageLightbox = ({
  images,
  index,
  alt,
  closeLabel,
  previousLabel,
  nextLabel,
  onClose,
  onNavigate,
}: Props) => {
  const count = images.length;
  const containerRef = useFocusTrap(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const reportedIndexRef = useRef(index);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(() => new Set());
  const [chromeVisible, setChromeVisible] = useState(true);
  const image = images[index];
  const imageKey = image ? image.path || image.url : "";
  const loaded = imageKey ? loadedImages.has(imageKey) : false;
  useScrollLock(true);
  const {
    onTouchStart: onDismissTouchStart,
    onTouchMove: onDismissTouchMove,
    onTouchEnd: onDismissTouchEnd,
    onTouchCancel: onDismissTouchCancel,
  } = usePullDownDismiss({
    enabled: true,
    onDismiss: onClose,
    surfaceRef: containerRef,
    canStart: (target) => !(target instanceof Element && target.closest("button")),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && index > 0 && loaded) {
        trackRef.current?.scrollTo({
          left: (index - 1) * trackRef.current.clientWidth,
          behavior: "smooth",
        });
      }
      if (event.key === "ArrowRight" && index < count - 1 && loaded) {
        trackRef.current?.scrollTo({
          left: (index + 1) * trackRef.current.clientWidth,
          behavior: "smooth",
        });
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [index, count, loaded, onClose]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const prevent = (event: Event) => event.preventDefault();

    node.addEventListener("contextmenu", prevent, true);
    node.addEventListener("dragstart", prevent, true);
    node.addEventListener("selectstart", prevent, true);
    return () => {
      node.removeEventListener("contextmenu", prevent, true);
      node.removeEventListener("dragstart", prevent, true);
      node.removeEventListener("selectstart", prevent, true);
    };
  }, [containerRef]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const visibleIndex = Math.round(track.scrollLeft / track.clientWidth);
    if (visibleIndex !== index) track.scrollLeft = index * track.clientWidth;
    reportedIndexRef.current = index;
  }, [index]);

  const markLoaded = useCallback((key: string) => {
    setLoadedImages((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }, []);
  const toggleChrome = useCallback(() => setChromeVisible((visible) => !visible), []);

  if (typeof document === "undefined") return null;
  if (!image) return null;

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!loaded || next < 0 || next >= count) return;
    setChromeVisible(true);
    track?.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  return createPortal(
    <div
      className={styles.overlay}
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-image-lightbox
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onTouchStart={onDismissTouchStart}
      onTouchMove={onDismissTouchMove}
      onTouchEnd={onDismissTouchEnd}
      onTouchCancel={onDismissTouchCancel}
    >
      <button type="button" className={styles.scrim} aria-label={closeLabel} onClick={onClose} />
      <div
        ref={trackRef}
        className={styles.track}
        data-image-lightbox-track
        onScroll={(event) => {
          const track = event.currentTarget;
          if (track.clientWidth === 0) return;
          const next = Math.max(
            0,
            Math.min(count - 1, Math.round(track.scrollLeft / track.clientWidth)),
          );
          if (next === reportedIndexRef.current) return;
          reportedIndexRef.current = next;
          setChromeVisible(true);
          onNavigate(next);
        }}
      >
        {images.map((item, itemIndex) => {
          const itemKey = item.path || item.url;
          return (
            <LightboxSlide
              key={itemKey}
              item={item}
              itemIndex={itemIndex}
              alt={alt}
              loaded={loadedImages.has(itemKey)}
              rendered={Math.abs(itemIndex - index) <= 1}
              onClose={onClose}
              onLoaded={markLoaded}
              onToggleChrome={toggleChrome}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {chromeVisible ? (
          <m.button
            key="close"
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            data-image-lightbox-close
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={CHROME_TRANSITION}
          >
            <CloseIcon />
          </m.button>
        ) : null}
        {chromeVisible && count > 1 ? (
          <m.button
            key="previous"
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            aria-label={previousLabel}
            disabled={!loaded || index === 0}
            onClick={() => goTo(index - 1)}
            initial={{ opacity: 0, x: -6, y: "-50%" }}
            animate={{ opacity: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0, x: -6, y: "-50%" }}
            transition={CHROME_TRANSITION}
          >
            {chevLeft}
          </m.button>
        ) : null}
        {chromeVisible && count > 1 ? (
          <m.button
            key="next"
            type="button"
            className={`${styles.nav} ${styles.next}`}
            aria-label={nextLabel}
            disabled={!loaded || index === count - 1}
            onClick={() => goTo(index + 1)}
            initial={{ opacity: 0, x: 6, y: "-50%" }}
            animate={{ opacity: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0, x: 6, y: "-50%" }}
            transition={CHROME_TRANSITION}
          >
            {chevRight}
          </m.button>
        ) : null}
        {chromeVisible && count > 1 ? (
          <m.span
            key="counter"
            className={styles.counter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={CHROME_TRANSITION}
          >
            {index + 1} / {count}
          </m.span>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body,
  );
};

export { ImageLightbox };
