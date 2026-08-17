"use client";

import { useCallback, useEffect, useMemo } from "react";

import { usePhotoDetailSession } from "@/features/photo-detail/_hooks/use-photo-detail-session";

import type { Photo } from "@/types/photo";

/**
 * 사진 상세 모달 상태 — URL(?photo=id)이 단일 출처(딥링크·공유).
 * prev/next는 photoIds(생략 시 photos)를 순환하므로 상세 사진을 일부만 캐시해도 전체 탐색 순서를 유지한다.
 *
 * @param {Photo[]} photos
 * @param {boolean} [navigationEnabled]
 * @param {(id: string) => void} [onNavigateStart]
 * @param {string[]} [photoIds]
 * @param {() => void} [onClose]
 * @param {boolean} [keyboardEnabled]
 * @returns {{ photo: Photo | null; open: boolean; close: () => void; next: () => void; prev: () => void; navigationIds: string[]; index: number }}
 */
const usePhotoModal = (
  photos: Photo[],
  navigationEnabled = true,
  onNavigateStart?: (id: string) => void,
  photoIds?: string[],
  onClose?: () => void,
  keyboardEnabled = true,
) => {
  const { activeId, close: closeSession, goto } = usePhotoDetailSession();
  const navigationIds = useMemo(
    () => photoIds ?? photos.map((photo) => photo.id),
    [photoIds, photos],
  );

  const index = activeId ? navigationIds.indexOf(activeId) : -1;
  const photo = activeId ? (photos.find((item) => item.id === activeId) ?? null) : null;
  const open = photo != null;
  const close = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    closeSession();
  }, [closeSession, onClose]);

  const step = useCallback(
    (delta: number) => {
      if (!navigationEnabled || index < 0 || navigationIds.length === 0) return;
      const nextIndex = (index + delta + navigationIds.length) % navigationIds.length;
      const nextId = navigationIds[nextIndex];
      onNavigateStart?.(nextId);
      goto(nextId);
    },
    [navigationEnabled, index, navigationIds, onNavigateStart, goto],
  );

  useEffect(() => {
    if (!open || !keyboardEnabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        close();
      } else if (navigationEnabled && event.key === "ArrowLeft") {
        event.stopImmediatePropagation();
        step(-1);
      } else if (navigationEnabled && event.key === "ArrowRight") {
        event.stopImmediatePropagation();
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, keyboardEnabled, navigationEnabled, close, step]);

  return {
    photo,
    open,
    close,
    next: () => step(1),
    prev: () => step(-1),
    navigationIds,
    index,
  };
};

export { usePhotoModal };
