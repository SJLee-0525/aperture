"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { ROUTES } from "@/constants/routes";
import { LocationList } from "@/features/map/_components/LocationList";
import { PhotoModal } from "@/features/photo-detail/_components/PhotoModal";
import type { Photo } from "@/types/photo";
import type { Tag } from "@/types/tag";

import styles from "./MapView.module.css";

/** 지도 캔버스는 client 전용(maplibre-gl) — /지도 라우트에서만 dynamic 로드 */
const MapCanvas = dynamic(() => import("@/features/map/_components/MapCanvas"), {
  ssr: false,
  loading: () => <div className={styles.loading} />,
});

type Props = {
  photos: Photo[];
  tags: Tag[];
};

/** 지도 — 위치 리스트 + 실제 지도(MapLibre+CARTO). 핀·리스트 클릭 → ?photo= 상세 모달. */
const MapView = ({ photos, tags }: Props) => {
  const router = useRouter();
  const geotagged = useMemo(() => photos.filter((photo) => photo.coords != null), [photos]);
  const onSelect = useCallback(
    (id: string) => router.push(`${ROUTES.PHOTO_MAP}?photo=${id}`, { scroll: false }),
    [router],
  );

  return (
    <>
      <div className={styles.view}>
        <LocationList photos={geotagged} />
        <div className={styles.stage}>
          <MapCanvas photos={geotagged} onSelect={onSelect} />
        </div>
      </div>
      <PhotoModal photos={geotagged} tags={tags} />
    </>
  );
};

export { MapView };
