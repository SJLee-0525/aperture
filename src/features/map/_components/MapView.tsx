"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import { LocationList } from "@/features/map/_components/LocationList";
import { MapPhotoModal } from "@/features/map/_components/MapPhotoModal";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useMapTools } from "@/features/map/_hooks/use-map-tools";

import { DETAIL_QUERY_KEYS } from "@/constants/routes";
import { openDetailQuery } from "@/lib/navigation/detail-query-url";


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

/**
 * 지도 — 위치 리스트 + 실제 지도(MapLibre+CARTO). 핀·리스트 클릭 → ?photo= 상세 모달.
 *
 * @param {Props} props
 * @param {MapLocation[]} props.locations
 * @returns {JSX.Element}
 */
const MapView = ({ locations }: Props) => {
  const { dict } = useLang();
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useMapTools(locations);
  const [visibleLocationIds, setVisibleLocationIds] = useState<string[] | null>(null);
  const photoIds = useMemo(() => locations.map((location) => location.id), [locations]);
  const visibleLocations = useMemo(() => {
    if (visibleLocationIds === null) return locations;
    const visibleIds = new Set(visibleLocationIds);
    return locations.filter((location) => visibleIds.has(location.id));
  }, [locations, visibleLocationIds]);
  const onSelect = useCallback((id: string) => openDetailQuery(DETAIL_QUERY_KEYS.photo, id), []);
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
      {/* 전면 지도라 보이는 제목이 없다. 낭독기가 지면을 확인할 수단과 랜드마크 진입점을
          남기려고 제목만 화면에서 감춘다. */}
      <main className={styles.view}>
        <h1 className="sr-only">{dict.mapNav}</h1>
        <LocationList locations={visibleLocations} />
        <div className={styles.stage}>
          <MapCanvas
            locations={locations}
            onSelect={onSelect}
            onVisibleLocationsChange={onVisibleLocationsChange}
          />
        </div>
      </main>
      <MapPhotoModal photoIds={photoIds} />
    </>
  );
};

export { MapView };
