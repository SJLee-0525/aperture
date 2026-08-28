"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const center: [number, number] = [coords.lng, coords.lat];
    const map = new maplibregl.Map({
      container,
      style: STYLE_URL[currentTheme()],
      center,
      zoom: 11,
      interactive: false,
      attributionControl: { compact: true },
    });

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

  return <div ref={containerRef} className={styles.canvas} />;
};

export default MiniMapCanvas;
