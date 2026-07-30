"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { ROUTES } from "@/constants/routes";
import { LocationList } from "@/features/map/_components/LocationList";
import { MapPhotoModal } from "@/features/map/_components/MapPhotoModal";
import type { MapLocation } from "@/features/map/_types/map-location";

import styles from "./MapView.module.css";

/** 지도 캔버스는 client 전용(maplibre-gl) — /지도 라우트에서만 dynamic 로드 */
const MapCanvas = dynamic(() => import("@/features/map/_components/MapCanvas"), {
  ssr: false,
  loading: () => <div className={styles.loading} />,
});

type Props = {
  locations: MapLocation[];
};

/** 지도 — 위치 리스트 + 실제 지도(MapLibre+CARTO). 핀·리스트 클릭 → ?photo= 상세 모달. */
const MapView = ({ locations }: Props) => {
  const router = useRouter();
  const photoIds = useMemo(() => locations.map((location) => location.id), [locations]);
  const onSelect = useCallback(
    (id: string) => router.push(`${ROUTES.PHOTO_MAP}?photo=${id}`, { scroll: false }),
    [router],
  );

  return (
    <>
      <div className={styles.view}>
        <LocationList locations={locations} />
        <div className={styles.stage}>
          <MapCanvas locations={locations} onSelect={onSelect} />
        </div>
      </div>
      <MapPhotoModal photoIds={photoIds} />
    </>
  );
};

export { MapView };
