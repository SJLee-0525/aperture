"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { memo, useEffect, useRef, useState, type SyntheticEvent } from "react";

import { Icon } from "@/components/Icon";
import type { ImageMeta } from "@/types/image";

import styles from "./ImageCarousel.module.css";

const loadImageLightbox = () => import("@/components/ImageLightbox");
const ImageLightbox = dynamic(() => loadImageLightbox().then((module) => module.ImageLightbox), {
  ssr: false,
});

const hideImageLoader = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.parentElement
    ?.querySelector<HTMLElement>("[data-image-loader]")
    ?.setAttribute("hidden", "");
};

type Props = {
  images: ImageMeta[];
  alt: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  sizes?: string;
};

type LightboxSessionProps = Pick<
  Props,
  "images" | "alt" | "closeLabel" | "previousLabel" | "nextLabel"
> & {
  initialIndex: number;
  onExit: (index: number) => void;
};

/**
 * 확대 탐색 인덱스를 원본 캐러셀 상태와 격리한다.
 *
 * @param {LightboxSessionProps} props
 * @param {ImageMeta[]} props.images
 * @param {number} props.initialIndex
 * @param {string} props.alt
 * @param {string} props.closeLabel
 * @param {string} props.previousLabel
 * @param {string} props.nextLabel
 * @param {(index: number) => void} props.onExit
 * @returns {JSX.Element}
 */
const LightboxSession = ({
  images,
  initialIndex,
  alt,
  closeLabel,
  previousLabel,
  nextLabel,
  onExit,
}: LightboxSessionProps) => {
  const [index, setIndex] = useState(initialIndex);

  return (
    <ImageLightbox
      images={images}
      index={index}
      alt={alt}
      closeLabel={closeLabel}
      previousLabel={previousLabel}
      nextLabel={nextLabel}
      onClose={() => onExit(index)}
      onNavigate={setIndex}
    />
  );
};

/**
 * 이미지 캐러셀 — scroll-snap 트랙(터치 스와이프 네이티브) + 양옆 오버레이 내비.
 * 슬라이드 클릭 시 ImageLightbox 로 확대. 순수 UI: 이미지 목록과 alt 만 받는다.
 * 1장이면 내비를 숨기고 정지 이미지로 동작.
 */
const ImageCarousel = memo(function ImageCarousel({
  images,
  alt,
  closeLabel,
  previousLabel,
  nextLabel,
  sizes = "(max-width: 760px) 100vw, 680px",
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reportedIndexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const count = images.length;

  useEffect(() => {
    const node = frameRef.current;
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
  }, []);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next === reportedIndexRef.current) return;
    reportedIndexRef.current = next;
    setIndex(next);
  };

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(count - 1, next));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  };

  if (count === 0) return null;

  return (
    <figure className={styles.carousel}>
      <div
        ref={frameRef}
        className={styles.frame}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className={styles.track} ref={trackRef} onScroll={onScroll}>
          {images.map((img, i) => {
            const imageKey = img.path || img.url;

            return (
              <button
                type="button"
                key={imageKey || i}
                className={styles.slide}
                aria-label={`${alt} — ${i + 1}`}
                onClick={() => setLightbox(i)}
                onFocus={() => void loadImageLightbox()}
                onPointerEnter={() => void loadImageLightbox()}
                onPointerDown={() => void loadImageLightbox()}
              >
                <Image
                  src={img.url}
                  alt={`${alt} — ${i + 1}`}
                  fill
                  sizes={sizes}
                  className={styles.img}
                  draggable={false}
                  onContextMenu={(event) => event.preventDefault()}
                  onDragStart={(event) => event.preventDefault()}
                  onLoad={hideImageLoader}
                  onError={hideImageLoader}
                />
                <span className={styles.imgLoader} data-image-loader aria-hidden="true">
                  <span className={styles.spinner} />
                </span>
              </button>
            );
          })}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              className={`${styles.nav} ${styles.prev}`}
              aria-label={previousLabel}
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              <Icon name="chevronLeft" size={17} />
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              aria-label={nextLabel}
              disabled={index === count - 1}
              onClick={() => goTo(index + 1)}
            >
              <Icon name="chevronRight" size={17} />
            </button>
          </>
        ) : null}
      </div>

      {lightbox != null ? (
        <LightboxSession
          images={images}
          initialIndex={lightbox}
          alt={alt}
          closeLabel={closeLabel}
          previousLabel={previousLabel}
          nextLabel={nextLabel}
          onExit={(lastIndex) => {
            setLightbox(null);
            goTo(lastIndex); // 닫을 때만 원본 캐러셀을 마지막으로 본 이미지와 동기화
          }}
        />
      ) : null}
    </figure>
  );
});

export { ImageCarousel };
