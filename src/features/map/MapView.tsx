"use client";

import { useLang } from "@/features/lang/use-lang";
import { LocationList } from "@/features/map/LocationList";
import { PhotoModal } from "@/features/photo-detail/PhotoModal";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./MapView.module.css";

type Props = {
  photos: Photo[];
  tags: Tag[];
};

/**
 * 지도 — 위치 리스트 + 지도 스테이지. 지금은 스타일라이즈드 맵 placeholder이며,
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY가 준비되면 이 stage를 실제 Google Maps로 교체한다(의도적 이탈 #3).
 */
const MapView = ({ photos, tags }: Props) => {
  const { dict } = useLang();
  const geotagged = photos.filter((photo) => photo.coords != null);

  return (
    <>
      <div className={styles.view}>
        <LocationList photos={geotagged} />
        <div className={styles.stage}>
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid slice"
            className={styles.map}
            aria-hidden="true"
          >
            <rect width="1000" height="600" fill="var(--map-land)" />
            <path
              d="M-20 360 Q 200 280 420 380 T 1020 340 L 1020 620 L -20 620 Z"
              fill="var(--map-water)"
            />
            <g
              stroke="var(--map-road)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              opacity="0.85"
            >
              <path d="M-20 160 L 1020 130" />
              <path d="M120 -20 L 180 620" />
              <path d="M520 -20 L 600 620" />
              <path d="M-20 420 L 1020 440" />
              <path d="M820 -20 L 760 620" />
            </g>
            <g stroke="var(--map-road)" strokeWidth="4" fill="none" opacity="0.55">
              <path d="M-20 260 L 1020 240" />
              <path d="M340 -20 L 380 620" />
              <path d="M680 -20 L 700 620" />
              <path d="M-20 520 L 1020 520" />
            </g>
          </svg>
          <div className={styles.note}>{dict.mapPending}</div>
        </div>
      </div>
      <PhotoModal photos={geotagged} tags={tags} />
    </>
  );
};

export { MapView };
