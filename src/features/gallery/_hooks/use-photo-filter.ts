"use client";

import { useMemo, useState } from "react";

import {
  ALL,
  FOCAL_MAX,
  FOCAL_MIN,
  buildSearchIndex,
  filterPhotos,
} from "@/features/gallery/_lib/filter-photos";
import type { GalleryPhoto } from "@/types/gallery-photo";

/**
 * 작업 그리드 필터 상태 + 파생 목록.
 * 검색어는 헤더(?q)에서 초기 시드를 받고 이후 로컬 상태로 관리(모바일 인갤러리 검색이 직접 갱신).
 */
const usePhotoFilter = (photos: GalleryPhoto[], initialQuery: string) => {
  const [tag, setTag] = useState<string>(ALL);
  const [query, setQuery] = useState<string>(initialQuery);
  const [camera, setCamera] = useState<string>(ALL);
  const [focalMin, setFocalMin] = useState<number>(FOCAL_MIN);
  const [focalMax, setFocalMax] = useState<number>(FOCAL_MAX);

  // 헤더 검색이 ?q 를 바꾸면 재시드 — effect 대신 렌더 중 조정(React 권장 패턴)
  const [seededQuery, setSeededQuery] = useState<string>(initialQuery);
  if (initialQuery !== seededQuery) {
    setSeededQuery(initialQuery);
    setQuery(initialQuery);
  }

  // haystack은 사진 목록 기준으로 한 번만 — 키스트로크마다 전체 join·toLowerCase를 반복하지 않는다.
  const searchIndex = useMemo(() => buildSearchIndex(photos), [photos]);
  const visible = useMemo(
    () => filterPhotos(photos, { tag, query, camera, focalMin, focalMax }, searchIndex),
    [photos, tag, query, camera, focalMin, focalMax, searchIndex],
  );

  const setFocal = (low: number, high: number) => {
    setFocalMin(low);
    setFocalMax(high);
  };

  const resetFilters = () => {
    setCamera(ALL);
    setFocalMin(FOCAL_MIN);
    setFocalMax(FOCAL_MAX);
  };

  const filtersActive = camera !== ALL || focalMin > FOCAL_MIN || focalMax < FOCAL_MAX;

  return {
    tag,
    setTag,
    query,
    setQuery,
    camera,
    setCamera,
    focalMin,
    focalMax,
    setFocal,
    resetFilters,
    filtersActive,
    visible,
  };
};

export { usePhotoFilter };
