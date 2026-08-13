"use client";

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

import { setMapCursorHover } from "@/utils/custom-cursor-events";

import type { MapLocation } from "@/features/map/_types/map-location";
import type { FeatureCollection } from "geojson";

import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./MapCanvas.module.css";

/** 테마별 CARTO 지도 스타일. */
const STYLE_URL = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

const currentTheme = (): "light" | "dark" =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

/**
 * 지도 레이어에 사용할 현재 테마 색상을 읽는다.
 *
 * @returns {{ accent: string; bg: string }}
 */
const readColors = () => {
  const cs = getComputedStyle(document.documentElement);
  const value = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    accent: value("--accent", "#0a84ff"),
    bg: value("--bg", "#ffffff"),
  };
};

const SOURCE_ID = "photos";
const CLUSTER_LAYER = "clusters";
const COUNT_LAYER = "cluster-count";
const POINT_LAYER = "unclustered";

type Props = {
  locations: MapLocation[];
  onSelect: (id: string) => void;
  onVisibleLocationsChange: (ids: string[]) => void;
};

const VIEWPORT_UPDATE_DELAY = 250;

/**
 * 사진 좌표를 클러스터링해 표시하는 MapLibre 지도.
 * 클러스터를 누르면 확장 줌으로 이동하고, 단일 핀을 누르면 사진을 선택한다.
 * 테마 변경 시 지도 스타일과 사용자 레이어를 다시 구성한다.
 *
 * @param {Props} props
 * @param {MapLocation[]} props.locations
 * @param {(id: string) => void} props.onSelect
 * @param {(ids: string[]) => void} props.onVisibleLocationsChange
 * @returns {JSX.Element}
 */
const MapCanvas = ({ locations, onSelect, onVisibleLocationsChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const points = locations.map(
      (location) => [location.coords.lng, location.coords.lat] as [number, number],
    );

    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: locations.map((location) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [location.coords.lng, location.coords.lat],
        },
        properties: { id: location.id },
      })),
    };

    // 초기 화면에 모든 핀이 들어오도록 bounds를 설정한다.
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

    let viewportUpdateTimer: ReturnType<typeof setTimeout> | undefined;
    const updateVisibleLocations = () => {
      clearTimeout(viewportUpdateTimer);
      viewportUpdateTimer = setTimeout(() => {
        const bounds = map.getBounds();
        onVisibleLocationsChange(
          locations
            .filter((location) => bounds.contains([location.coords.lng, location.coords.lat]))
            .map((location) => location.id),
        );
      }, VIEWPORT_UPDATE_DELAY);
    };

    // 최초 로드와 테마 변경 후 소스와 레이어를 다시 만든다.
    const render = () => {
      // style.load 시점에는 스타일 구조가 준비됐지만 베이스맵 소스는 아직 로딩 중이라
      // isStyleLoaded()가 false일 수 있다. 이때도 사용자 소스·레이어 추가는 가능하다.
      if (map.getSource(SOURCE_ID)) return;
      const { accent, bg } = readColors();

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data,
        cluster: true,
        clusterMaxZoom: 14, // 이 줌 이상은 클러스터링 안 함(개별 핀)
        clusterRadius: 50, // px — 가까움 판정 반경(줌아웃 시 묶임, 줌인 시 쪼개짐)
      });

      // 사진 수에 따라 클러스터 원의 크기를 조절한다.
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": accent,
          "circle-opacity": 0.92,
          "circle-stroke-width": 3,
          "circle-stroke-color": bg,
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 10, 28, 25, 36, 50, 46],
        },
      });

      // 클러스터 개수 라벨
      map.addLayer({
        id: COUNT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Semibold", "Open Sans Regular"],
          "text-size": ["step", ["get", "point_count"], 12, 10, 14, 25, 16],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });

      // 단일 사진은 액센트색 원으로 표시한다.
      map.addLayer({
        id: POINT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": accent,
          "circle-radius": 7,
          "circle-stroke-width": 3,
          "circle-stroke-color": bg,
        },
      });
    };

    map.on("load", render);
    map.on("load", updateVisibleLocations);
    map.on("moveend", updateVisibleLocations);
    map.on("resize", updateVisibleLocations);
    // setStyle 직후에도 완성된 스타일을 보장하는 style.load에서 소스·레이어를 다시 붙인다.
    map.on("style.load", render);

    // 클러스터가 나뉘는 줌 단계로 이동한다.
    map.on("click", CLUSTER_LAYER, (event) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const center = feature.geometry.coordinates as [number, number];
      const clusterId = feature.properties?.cluster_id as number;
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({ center, zoom });
      });
    });

    // 단일 핀을 누르면 사진 상세를 연다.
    map.on("click", POINT_LAYER, (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelect(id);
    });

    for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
      map.on("mouseenter", layer, () => {
        map.getCanvas().style.cursor = "pointer";
        setMapCursorHover(true);
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
        setMapCursorHover(false);
      });
    }

    // 테마가 바뀌면 지도 스타일을 교체한다.
    const observer = new MutationObserver(() => {
      map.setStyle(STYLE_URL[currentTheme()]);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      clearTimeout(viewportUpdateTimer);
      observer.disconnect();
      setMapCursorHover(false);
      map.remove();
    };
  }, [locations, onSelect, onVisibleLocationsChange]);

  return <div ref={containerRef} className={styles.canvas} />;
};

export default MapCanvas;
