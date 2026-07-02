"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import {
  deletePhoto,
  listPhotosAdmin,
  setPhotoPublished,
  updatePhotoOrder,
} from "@/lib/firebase/firestore";
import { deletePhotoImages } from "@/lib/firebase/storage";
import type { Photo } from "@/types/photo";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 사진 목록 상태 관리 — 로드·드래그 정렬·공개 토글·삭제.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const usePhotosAdmin = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listPhotosAdmin()
      .then((loaded) => {
        if (!alive) return;
        setPhotos(loaded);
        setStatus("ready");
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  /** 드래그 종료 → 새 순서대로 order 재부여, 값이 실제로 바뀐 항목만 저장. */
  const reorder = useCallback(
    async (activeId: string, overId: string) => {
      if (activeId === overId) return;

      const from = photos.findIndex((p) => p.id === activeId);
      const to = photos.findIndex((p) => p.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(photos, from, to).map((p, index) => ({ ...p, order: index }));
      const previousOrder = new Map(photos.map((p) => [p.id, p.order]));
      const toPersist = moved.filter((p) => previousOrder.get(p.id) !== p.order);

      setPhotos(moved);
      try {
        await Promise.all(toPersist.map((p) => updatePhotoOrder(p.id, p.order)));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [photos],
  );

  const togglePublished = useCallback(async (id: string, next: boolean) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, published: next } : p)));
    try {
      await setPhotoPublished(id, next);
    } catch (caught) {
      // 실패 시 롤백.
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, published: !next } : p)));
      setError((caught as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await deletePhoto(id);
      await deletePhotoImages(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  return { photos, status, error, reorder, togglePublished, remove };
};

export { usePhotosAdmin };
