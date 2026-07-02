import { formatCoords } from "@/lib/format/format-coords";
import type { Coords } from "@/types/coords";

import styles from "./MiniMap.module.css";

type Props = {
  place: string;
  coords: Coords | null;
};

/**
 * 상세 패널용 스타일라이즈드 미니맵. 상세를 열 때마다 실제 지도를 로드하면 무겁고 타일 요청이 많아
 * 추상 SVG로 유지 — 실제 지도(MapLibre+CARTO)는 /지도 뷰에서만.
 */
const MiniMap = ({ place, coords }: Props) => (
  <div className={styles.map}>
    <svg
      viewBox="0 0 400 190"
      preserveAspectRatio="xMidYMid slice"
      className={styles.svg}
      aria-hidden="true"
    >
      <rect width="400" height="190" fill="var(--map-land)" />
      <path d="M-10 120 Q 80 90 160 130 T 360 110 L 420 200 L -10 200 Z" fill="var(--map-water)" />
      <g stroke="var(--map-road)" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M-10 60 L 410 50" />
        <path d="M40 -10 L 70 200" />
        <path d="M210 -10 L 240 200" />
        <path d="M-10 140 L 410 150" />
      </g>
    </svg>
    {coords ? <span className={styles.pin} /> : null}
    <div className={styles.coords}>
      <div className={styles.place}>
        <div className={styles.nm}>{place}</div>
        {coords ? <div className={styles.co}>{formatCoords(coords)}</div> : null}
      </div>
    </div>
  </div>
);

export { MiniMap };
