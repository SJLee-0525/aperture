"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ImageMeta } from "@/types/image";

import styles from "./ImageCarousel.module.css";

const loadImageLightbox = () => import("@/components/ImageLightbox");
const ImageLightbox = dynamic(() => loadImageLightbox().then((module) => module.ImageLightbox), {
  ssr: false,
});

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
  alt: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  sizes?: string;
};

/**
 * 이미지 캐러셀 — scroll-snap 트랙(터치 스와이프 네이티브) + 양옆 오버레이 내비.
 * 슬라이드 클릭 시 ImageLightbox 로 확대. 순수 UI: 이미지 목록과 alt 만 받는다.
 * 1장이면 내비를 숨기고 정지 이미지로 동작.
 */
const ImageCarousel = ({
  images,
  alt,
  closeLabel,
  previousLabel,
  nextLabel,
  sizes = "(max-width: 760px) 100vw, 680px",
}: Props) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reportedIndexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(() => new Set());
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

  const markLoaded = (key: string) => {
    setLoadedImages((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return next;
    });
  };

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
            const loaded = loadedImages.has(imageKey);

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
                  onLoad={() => markLoaded(imageKey)}
                  onError={() => markLoaded(imageKey)}
                />
                {loaded ? null : (
                  <span className={styles.imgLoader} aria-hidden="true">
                    <span className={styles.spinner} />
                  </span>
                )}
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
              {chevLeft}
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              aria-label={nextLabel}
              disabled={index === count - 1}
              onClick={() => goTo(index + 1)}
            >
              {chevRight}
            </button>
          </>
        ) : null}
      </div>

      {lightbox != null ? (
        <ImageLightbox
          images={images}
          index={lightbox}
          alt={alt}
          closeLabel={closeLabel}
          previousLabel={previousLabel}
          nextLabel={nextLabel}
          onClose={() => setLightbox(null)}
          onNavigate={(next) => {
            setLightbox(next);
            goTo(next); // 닫았을 때 캐러셀이 마지막으로 본 이미지를 보여주도록 동기화
          }}
        />
      ) : null}
    </figure>
  );
};

export { ImageCarousel };
