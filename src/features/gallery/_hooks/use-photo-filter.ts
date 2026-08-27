"use client";

import { useMemo, useState } from "react";

import { buildSearchIndex, filterPhotos } from "@/features/gallery/_lib/filter-photos";

import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";
import {
  ALL,
  FOCAL_MAX,
  FOCAL_MIN,
  buildPhotoFilterHref,
  parsePhotoFilterQuery,
} from "@/lib/photo/filter-query";

import type { PhotoFilterState, PhotoFilterVocabulary } from "@/lib/photo/filter-query";
import type { GalleryPhoto } from "@/types/gallery-photo";

/**
 * 사진 그리드 필터를 URL query와 동기화한다.
 * 검색어는 내비게이션 검색이 갱신하는 ?q를 사용한다. useSearchParams는 여기서 구독하지
 * 않는다. GalleryView가 값을 파싱해 전달하므로 ?photo= 변경은 그리드 memo 경계를 넘지 않는다.
 *
 * 슬라이더를 움직이는 동안에는 로컬 draft만 바꾸고 조작이 끝날 때 URL을 한 번 교체한다.
 * 틱마다 replaceState를 부르면 Safari rate limit(30초당 ~100회)에 걸린다.
 *
 * @param {GalleryPhoto[]} photos
 * @param {string} initialQuery ?q 검색어 (이 훅은 읽기만 한다)
 * @param {PhotoFilterState} urlFilters GalleryView가 URL에서 관대 파싱한 필터 상태
 * @param {PhotoFilterVocabulary} vocabulary 태그 사전·카메라 목록 (URL 재파싱·직렬화용)
 * @returns {{ tag: string; setTag: (tag: string) => void; camera: string; setCamera: (camera: string) => void; focalMin: number; focalMax: number; setFocal: (low: number, high: number) => void; commitFocal: (low: number, high: number) => void; cancelFocal: () => void; resetFilters: () => void; applyFilters: (partial: Partial<PhotoFilterState>, history: "push" | "replace") => void; filtersActive: boolean; visible: GalleryPhoto[] }}
 */
const usePhotoFilter = (
  photos: GalleryPhoto[],
  initialQuery: string,
  urlFilters: PhotoFilterState,
  vocabulary: PhotoFilterVocabulary,
) => {
  const query = initialQuery;
  // 초점거리 draft는 조작 중에만 사용하며 URL에는 기록하지 않는다.
  const [draftFocal, setDraftFocal] = useState<{ low: number; high: number } | null>(null);

  // 뒤로가기, 딥링크, 도구 호출로 URL focal이 바뀌면 draft를 버린다.
  // effect가 아니라 렌더 중 조정이라 이전 draft가 한 렌더 보이는 일이 없다.
  const [prevUrlFocal, setPrevUrlFocal] = useState({
    min: urlFilters.focalMin,
    max: urlFilters.focalMax,
  });
  if (prevUrlFocal.min !== urlFilters.focalMin || prevUrlFocal.max !== urlFilters.focalMax) {
    setPrevUrlFocal({ min: urlFilters.focalMin, max: urlFilters.focalMax });
    setDraftFocal(null);
  }

  const tag = urlFilters.tag;
  const camera = urlFilters.camera;
  const focalMin = draftFocal?.low ?? urlFilters.focalMin;
  const focalMax = draftFocal?.high ?? urlFilters.focalMax;

  /**
   * 현재 URL 관대 파싱 → partial 병합 → 재검증 → canonical 직렬화 → history 반영.
   * q와 열린 ?photo=를 보존하므로 필터 결과에서 빠진 사진 모달도 닫지 않는다.
   */
  const applyFilters = (partial: Partial<PhotoFilterState>, history: "push" | "replace"): void => {
    const params = new URLSearchParams(window.location.search);
    const merged = { ...parsePhotoFilterQuery(params, vocabulary), ...partial };
    if (merged.focalMin > merged.focalMax) {
      merged.focalMin = FOCAL_MIN;
      merged.focalMax = FOCAL_MAX;
    }
    const href = buildPhotoFilterHref(window.location.pathname, merged, {
      q: params.get("q"),
      photo: params.get("photo"),
    });
    // 같은 값의 중복 커밋(pointerup+blur 등)은 URL을 다시 쓰지 않는다.
    if (href === `${window.location.pathname}${window.location.search}`) return;
    (history === "push" ? pushCurrentUrl : replaceCurrentUrl)(href);
  };

  const setTag = (next: string) => applyFilters({ tag: next }, "push");
  const setCamera = (next: string) => applyFilters({ camera: next }, "push");

  /** 드래그 중 화면에 표시할 focal draft를 갱신한다. */
  const setFocal = (low: number, high: number) => setDraftFocal({ low, high });

  /** 드래그가 끝나면 focal 범위를 현재 history entry에 기록한다. */
  const commitFocal = (low: number, high: number) =>
    applyFilters({ focalMin: low, focalMax: high }, "replace");

  /** 취소된 조작의 focal draft를 버린다. */
  const cancelFocal = () => setDraftFocal(null);

  const resetFilters = () => {
    setDraftFocal(null);
    applyFilters({ camera: ALL, focalMin: FOCAL_MIN, focalMax: FOCAL_MAX }, "push");
  };

  // 검색용 문자열은 사진 목록이 바뀔 때만 다시 만든다.
  const searchIndex = useMemo(() => buildSearchIndex(photos), [photos]);
  const visible = useMemo(
    () => filterPhotos(photos, { tag, query, camera, focalMin, focalMax }, searchIndex),
    [photos, tag, query, camera, focalMin, focalMax, searchIndex],
  );

  // 태그 칩은 팝오버 밖 별도 UI라 배지·초기화 대상에서 제외한다 (기존 의미 유지).
  const filtersActive = camera !== ALL || focalMin > FOCAL_MIN || focalMax < FOCAL_MAX;

  return {
    tag,
    setTag,
    camera,
    setCamera,
    focalMin,
    focalMax,
    setFocal,
    commitFocal,
    cancelFocal,
    resetFilters,
    applyFilters,
    filtersActive,
    visible,
  };
};

export { usePhotoFilter };
