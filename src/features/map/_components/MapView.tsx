"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { LocationList } from "@/features/map/_components/LocationList";
import { MapPhotoModal } from "@/features/map/_components/MapPhotoModal";

import { useLang } from "@/features/lang/_hooks/use-lang";
import { useMapTools } from "@/features/map/_hooks/use-map-tools";

import { DETAIL_QUERY_KEYS } from "@/constants/routes";
import { detailQueryHref } from "@/lib/navigation/detail-query-url";

import type { MapLocation } from "@/features/map/_lib/map-location";

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
 */
const MapView = ({ locations }: Props) => {
  const { dict } = useLang();
  const router = useRouter();
  // WebMCP 도구 — 미지원 브라우저에선 no-op(어댑터 기능 감지).
  useMapTools(locations);
  const [visibleLocationIds, setVisibleLocationIds] = useState<string[] | null>(null);
  const photoIds = useMemo(() => locations.map((location) => location.id), [locations]);
  const visibleLocations = useMemo(() => {
    if (visibleLocationIds === null) return locations;
    const visibleIds = new Set(visibleLocationIds);
    return locations.filter((location) => visibleIds.has(location.id));
  }, [locations, visibleLocationIds]);
  /* 지도만 라우터로 연다. history API 를 직접 쓰면 App Router 가 그 entry 를 모르는 채
     popstate 를 받아 이 세그먼트를 다시 마운트하고, 그때 WebGL 지도가 통째로 사라진다.
     query 는 그대로 두고 photo 키만 더한다. */
  const onSelect = useCallback(
    (id: string) => {
      router.push(detailQueryHref(window.location, DETAIL_QUERY_KEYS.photo, id), { scroll: false });
    },
    [router],
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
