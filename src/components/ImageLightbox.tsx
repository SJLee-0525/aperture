"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "@/components/CloseIcon";
import { Icon } from "@/components/Icon";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useImageZoom } from "@/hooks/use-image-zoom";
import { useOverlayDrag } from "@/hooks/use-overlay-drag";
import { useOverlayLayer } from "@/hooks/use-overlay-layer";
import { useScrollLock } from "@/hooks/use-scroll-lock";

import type { ImageMeta } from "@/types/image";
import type { RefObject } from "react";

import styles from "./ImageLightbox.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const CHROME_TRANSITION = { duration: 0.2, ease: EASE } as const;

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
  zoomSurfaceRef?: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onLoaded: (key: string) => void;
  onStageClick: () => void;
};

const LightboxSlide = memo(function LightboxSlide({
  item,
  itemIndex,
  alt,
  loaded,
  rendered,
  zoomSurfaceRef,
  onClose,
  onLoaded,
  onStageClick,
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
        onClick={onStageClick}
      >
        {/* 줌 transform 은 이 래퍼만 소유한다. .stage 의 진입 애니메이션(lbpop)과
            같은 요소에 두면 CSS animation 이 인라인 transform 을 덮는다. */}
        <div ref={zoomSurfaceRef} className={styles.zoomSurface}>
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
        </div>
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
 *
 * @param {Props} props
 * @param {ImageMeta[]} props.images
 * @param {number} props.index
 * @param {string} props.alt
 * @param {string} props.closeLabel
 * @param {string} props.previousLabel
 * @param {string} props.nextLabel
 * @param {() => void} props.onClose
 * @param {(index: number) => void} props.onNavigate
 * @returns {ReactPortal | null}
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
  const dismissSurfaceRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLButtonElement>(null);
  const reportedIndexRef = useRef(index);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(() => new Set());
  const [chromeVisible, setChromeVisible] = useState(true);
  const image = images[index];
  const imageKey = image ? image.path || image.url : "";
  const loaded = imageKey ? loadedImages.has(imageKey) : false;
  useScrollLock(true);
  const isTopLayer = useOverlayLayer(true);
  const {
    stageRef: zoomSurfaceRef,
    zoomed,
    reset: resetZoom,
    handleStageClick,
  } = useImageZoom({
    enabled: isTopLayer,
    resetKey: imageKey,
    getMaxScale: (stage) => {
      const surfaceWidth = stage.offsetWidth;
      if (!image || surfaceWidth === 0) return 3;
      // 저장 해상도를 넘는 확대는 뭉개진다. 픽셀 밀도까지만 열되 작은 이미지도
      // 최소 2배는 볼 수 있게 한다.
      return Math.min(4, Math.max(2, image.w / surfaceWidth));
    },
    onZoomChange: (nextZoomed) => {
      if (!nextZoomed) return;
      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;
      // 핀치 직전의 관성 스크롤이 남아 있으면 줌 해제 때 스냅이 옆 이미지로 넘긴다.
      // 렌더 클로저의 index 는 방금 보고된 이동을 모를 수 있어 ref 가 기준이다.
      const pinnedIndex = reportedIndexRef.current;
      track.scrollTo({ left: pinnedIndex * track.clientWidth, behavior: "auto" });
    },
  });
  const {
    onTouchStart: onDismissTouchStart,
    onTouchMove: onDismissTouchMove,
    onTouchEnd: onDismissTouchEnd,
    onTouchCancel: onDismissTouchCancel,
  } = useOverlayDrag({
    enabled: !zoomed,
    onDismiss: onClose,
    // 오버레이 전체를 내리면 뒤 지면(긴 본문·고정 TOC)이 매 프레임 다시 그려진다.
    // 트랙 래퍼만 움직이고 스크림은 고정한 채 딤만 낮춘다.
    surfaceRef: dismissSurfaceRef,
    scrimRef,
    canStart: (target) => !(target instanceof Element && target.closest("button")),
  });

  // Escape 와 방향키를 한 리스너에서 다룬다. `useEscapeKey` 로 Escape 만 떼면 확대 상태에서
  // 원배율 복귀와 이동의 순서가 갈리므로 자체 리스너를 유지한다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isTopLayer) return;
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        // 확대 상태의 ESC 는 닫기 전에 원배율 복귀 단계를 거친다.
        if (zoomed) {
          resetZoom(true);
          return;
        }
        onClose();
        return;
      }
      // 의도적 이동은 확대 중에도 허용한다. 원배율로 돌아온 뒤 이동해야
      // onScroll 인덱스 보고가 살아난다.
      if (event.key === "ArrowLeft" && index > 0 && loaded) {
        if (zoomed) resetZoom(false);
        trackRef.current?.scrollTo({
          left: (index - 1) * trackRef.current.clientWidth,
          behavior: "smooth",
        });
      }
      if (event.key === "ArrowRight" && index < count - 1 && loaded) {
        if (zoomed) resetZoom(false);
        trackRef.current?.scrollTo({
          left: (index + 1) * trackRef.current.clientWidth,
          behavior: "smooth",
        });
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [index, count, isTopLayer, loaded, onClose, resetZoom, zoomed]);

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
  const onStageClick = useCallback(
    () => handleStageClick(toggleChrome),
    [handleStageClick, toggleChrome],
  );

  if (typeof document === "undefined") return null;
  if (!image) return null;

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!loaded || next < 0 || next >= count) return;
    // 의도적 이동은 확대 중에도 허용한다. 원배율로 돌아온 뒤 이동해야
    // onScroll 인덱스 보고가 살아난다.
    if (zoomed) resetZoom(false);
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
      <button
        ref={scrimRef}
        type="button"
        className={styles.scrim}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div ref={dismissSurfaceRef} className={styles.dismissSurface}>
        <div
          ref={trackRef}
          className={styles.track}
          data-image-lightbox-track
          data-zoomed={zoomed || undefined}
          onScroll={(event) => {
            if (zoomed) return;
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
                zoomSurfaceRef={itemIndex === index ? zoomSurfaceRef : undefined}
                onClose={onClose}
                onLoaded={markLoaded}
                onStageClick={onStageClick}
              />
            );
          })}
        </div>
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
            <Icon name="chevronLeft" size={17} />
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
            <Icon name="chevronRight" size={17} />
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
