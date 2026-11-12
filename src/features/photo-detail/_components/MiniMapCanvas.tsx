"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { useLang } from "@/features/lang/_hooks/use-lang";

import { createMapOrNull } from "@/lib/geo/create-map-or-null";

import type { Coords } from "@/types/coords";

import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./MiniMapCanvas.module.css";

/** CARTO 무료 GL 스타일 — 키/카드 불필요. /map 과 동일 소스, 테마 연동. */
const STYLE_URL = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

const currentTheme = (): "light" | "dark" =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

type Props = { coords: Coords };

/**
 * 상세 패널용 실지도 미니맵 (MapLibre GL + CARTO). 좌표 중심 + 단일 마커.
 * interactive:false — 미니맵이라 스크롤/드래그를 뺏지 않는다(패널 스크롤 보존).
 * next/dynamic(ssr:false)로만 로드 — maplibre-gl 은 window 의존.
 */
const MiniMapCanvas = ({ coords }: Props) => {
  const { dict } = useLang();
  const containerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const center: [number, number] = [coords.lng, coords.lat];
    const map = createMapOrNull({
      container,
      style: STYLE_URL[currentTheme()],
      center,
      zoom: 11,
      interactive: false,
      attributionControl: { compact: true },
    });
    if (!map) {
      setUnavailable(true);
      return;
    }

    const pin = document.createElement("span");
    pin.className = styles.pin;
    new maplibregl.Marker({ element: pin }).setLngLat(center).addTo(map);

    const observer = new MutationObserver(() => map.setStyle(STYLE_URL[currentTheme()]));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [coords.lat, coords.lng]);

  return (
    <div ref={containerRef} className={styles.canvas}>
      {unavailable ? (
        <p className={styles.unavailable} role="status">
          {dict.mapUnavailable}
        </p>
      ) : null}
    </div>
  );
};

export default MiniMapCanvas;
