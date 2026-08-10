"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { LocationList } from "@/features/map/_components/LocationList";
import { MapPhotoModal } from "@/features/map/_components/MapPhotoModal";
import type { MapLocation } from "@/features/map/_types/map-location";
import { useMapTools } from "@/features/map/_hooks/use-map-tools";

import styles from "./MapView.module.css";

/** 지도 캔버스는 client 전용(maplibre-gl) — /지도 라우트에서만 dynamic 로드 */
const MapCanvas = dynamic(() => import("@/features/map/_components/MapCanvas"), {
  ssr: false,
  loading: () => <div className={styles.loading} />,
});

type Props = {
  locations: MapLocation[];
};

/**
 * 지도 — 위치 리스트 + 실제 지도(MapLibre+CARTO). 핀·리스트 클릭 → ?photo= 상세 모달.
 *
 * @param {Props} props
 * @param {MapLocation[]} props.locations
 * @returns {JSX.Element}
 */
const MapView = ({ locations }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useMapTools(locations);
  const [visibleLocationIds, setVisibleLocationIds] = useState<string[] | null>(null);
  const photoIds = useMemo(() => locations.map((location) => location.id), [locations]);
  const visibleLocations = useMemo(() => {
    if (visibleLocationIds === null) return locations;
    const visibleIds = new Set(visibleLocationIds);
    return locations.filter((location) => visibleIds.has(location.id));
  }, [locations, visibleLocationIds]);
  // 현재 pathname 기반 — 로케일 프리픽스(/ko/photo/map)를 그대로 유지한 채 ?photo= 만 붙인다.
  const onSelect = useCallback(
    (id: string) => router.push(`${pathname}?photo=${id}`, { scroll: false }),
    [router, pathname],
  );
  const onVisibleLocationsChange = useCallback((ids: string[]) => {
    setVisibleLocationIds((current) => {
      if (
        current?.length === ids.length &&
        current.every((currentId, index) => currentId === ids[index])
      ) {
        return current;
      }
      return ids;
    });
  }, []);

  return (
    <>
      <div className={styles.view}>
        <LocationList locations={visibleLocations} />
        <div className={styles.stage}>
          <MapCanvas
            locations={locations}
            onSelect={onSelect}
            onVisibleLocationsChange={onVisibleLocationsChange}
          />
        </div>
      </div>
      <MapPhotoModal photoIds={photoIds} />
    </>
  );
};

export { MapView };
