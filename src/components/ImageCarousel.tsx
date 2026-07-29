"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { ImageLightbox } from "@/components/ImageLightbox";
import type { ImageMeta } from "@/types/image";

import styles from "./ImageCarousel.module.css";

type Props = {
  images: ImageMeta[];
  alt: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  sizes?: string;
};

/**
 * 이미지 캐러셀 — scroll-snap 트랙(터치 스와이프 네이티브) + 양옆 오버레이 내비 + 도트.
 * 슬라이드 클릭 시 ImageLightbox 로 확대. 순수 UI: 이미지 목록과 alt 만 받는다.
 * 1장이면 내비·도트를 숨기고 정지 이미지로 동작.
 */
const ImageCarousel = ({
  images,
  alt,
  closeLabel,
  previousLabel,
  nextLabel,
  sizes = "(max-width: 760px) 100vw, 680px",
}: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const count = images.length;

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
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
      <div className={styles.frame}>
        <div className={styles.track} ref={trackRef} onScroll={onScroll}>
          {images.map((img, i) => (
            <button
              type="button"
              key={img.path || i}
              className={styles.slide}
              aria-label={`${alt} — ${i + 1}`}
              onClick={() => setLightbox(i)}
            >
              <Image
                src={img.url}
                alt={`${alt} — ${i + 1}`}
                fill
                sizes={sizes}
                className={styles.img}
              />
            </button>
          ))}
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
              ‹
            </button>
            <button
              type="button"
              className={`${styles.nav} ${styles.next}`}
              aria-label={nextLabel}
              disabled={index === count - 1}
              onClick={() => goTo(index + 1)}
            >
              ›
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
