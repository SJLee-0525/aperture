"use client";

import dynamic from "next/dynamic";

import { formatCoords } from "@/lib/format/format-coords";
import type { Coords } from "@/types/coords";

import styles from "./DetailMiniMap.module.css";

/** 실지도 캔버스는 client 전용(maplibre-gl) — 상세를 열 때만 dynamic 로드. */
const MiniMapCanvas = dynamic(() => import("@/features/photo-detail/_components/MiniMapCanvas"), {
  ssr: false,
  loading: () => <div className={styles.loading} />,
});

type Props = {
  place: string;
  coords: Coords | null;
};

/** 상세 패널 미니맵 — 좌표가 있으면 실지도, 없으면 빈 지면 + 장소명 캡션. */
const DetailMiniMap = ({ place, coords }: Props) => (
  <div className={styles.map}>
    {coords ? <MiniMapCanvas coords={coords} /> : <div className={styles.empty} />}
    <div className={styles.coords}>
      <div className={styles.place}>
        <div className={styles.nm}>{place}</div>
        {coords ? <div className={styles.co}>{formatCoords(coords)}</div> : null}
      </div>
    </div>
  </div>
);

export { DetailMiniMap };
