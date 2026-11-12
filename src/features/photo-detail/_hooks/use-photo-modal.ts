"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useDetailQuerySession } from "@/hooks/use-detail-query-session";

import { DETAIL_QUERY_KEYS } from "@/constants/routes";

import type { Photo } from "@/types/photo";

/**
 * 사진 상세 모달 상태 — URL(?photo=id)이 단일 출처(딥링크·공유).
 * prev/next는 photoIds(생략 시 photos)를 순환하므로 상세 사진을 일부만 캐시해도 전체 탐색 순서를 유지한다.
 */
const usePhotoModal = (
  photos: Photo[],
  navigationEnabled = true,
  onNavigateStart?: (id: string) => void,
  photoIds?: string[],
  onClose?: () => void,
  keyboardEnabled = true,
) => {
  const {
    activeId,
    close: closeSession,
    goto,
  } = useDetailQuerySession(DETAIL_QUERY_KEYS.photo, { openedOutside: true });
  const navigationIds = useMemo(
    () => photoIds ?? photos.map((photo) => photo.id),
    [photoIds, photos],
  );

  const activePhoto = activeId ? (photos.find((item) => item.id === activeId) ?? null) : null;
  const [heldPhoto, setHeldPhoto] = useState<Photo | null>(null);
  if (activePhoto != null && activePhoto !== heldPhoto) setHeldPhoto(activePhoto);
  else if (activeId == null && heldPhoto != null) setHeldPhoto(null);
  /* 열린 채 상세를 아직 받지 못한 사진으로 넘어가면 직전 사진을 계속 보여 준다.
     photo 가 null 이 되면 모달 전체가 퇴장했다가 상세 도착 후 다시 등장한다. */
  const holding =
    activePhoto == null &&
    activeId != null &&
    heldPhoto != null &&
    navigationIds.includes(activeId);
  const photo = holding ? heldPhoto : activePhoto;
  const index = photo ? navigationIds.indexOf(photo.id) : -1;
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

  // Escape 와 좌우 이동이 같은 리스너에 있고 게이트가 top-layer 가 아니라 `keyboardEnabled`
  // 다. 모달이 스스로 키보드를 넘기는 구간(모바일 패널 펼침)을 표현하므로 `useEscapeKey` 로
  // 옮기면 그 조건이 사라진다.
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
