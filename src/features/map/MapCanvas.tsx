"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { Photo } from "@/types/photo";

import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./MapCanvas.module.css";

/** CARTO 무료 GL 스타일 — 키/카드 불필요, 그레이스케일. 테마에 맞춰 전환. */
const STYLE_URL = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

const currentTheme = (): "light" | "dark" =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

type Props = {
  photos: Photo[];
  onSelect: (id: string) => void;
};

/**
 * 실제 지도 (MapLibre GL + CARTO 무료 타일). 핀 클릭 → onSelect(id). 테마 토글 시 Positron↔Dark Matter 전환.
 * next/dynamic(ssr:false)로만 로드 — maplibre-gl은 window에 의존.
 */
const MapCanvas = ({ photos, onSelect }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const points = photos
      .filter((photo) => photo.coords)
      .map((photo) => [photo.coords!.lng, photo.coords!.lat] as [number, number]);

    // 생성자에서 bounds로 초기 프레이밍 → 모든 핀이 화면에 들어오게 (로드 타이밍 이슈 회피)
    const fit =
      points.length > 1
        ? {
            bounds: points.reduce(
              (bounds, point) => bounds.extend(point),
              new maplibregl.LngLatBounds(points[0], points[0]),
            ),
            fitBoundsOptions: { padding: 64, maxZoom: 7 },
          }
        : { center: points[0] ?? ([135, 37] as [number, number]), zoom: 5 };

    const map = new maplibregl.Map({
      container,
      style: STYLE_URL[currentTheme()],
      attributionControl: { compact: true },
      ...fit,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    for (const photo of photos) {
      if (!photo.coords) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = styles.marker;
      el.title = photo.place.ko;
      el.addEventListener("click", () => onSelect(photo.id));
      new maplibregl.Marker({ element: el })
        .setLngLat([photo.coords.lng, photo.coords.lat])
        .addTo(map);
    }

    // 테마 토글에 맞춰 지도 스타일 교체 (마커는 DOM 오버레이라 유지됨)
    const observer = new MutationObserver(() => {
      map.setStyle(STYLE_URL[currentTheme()]);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [photos, onSelect]);

  return <div ref={containerRef} className={styles.canvas} />;
};

export default MapCanvas;
