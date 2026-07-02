"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import {
  deleteAlbum,
  listAlbumsAdmin,
  setAlbumPublished,
  updateAlbumOrder,
} from "@/lib/firebase/albums";
import { listPhotosAdmin } from "@/lib/firebase/firestore";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 앨범 목록 상태 관리 — 로드·드래그 정렬·공개 토글·삭제.
 * 커버 썸네일 해석용으로 사진 이미지 URL 맵도 함께 돌려준다(coverPhotoId → url).
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useAlbumsAdmin = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [coverUrls, setCoverUrls] = useState<Map<string, string>>(new Map());
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listAlbumsAdmin(), listPhotosAdmin()])
      .then(([loadedAlbums, loadedPhotos]) => {
        if (!alive) return;
        setAlbums(loadedAlbums);
        setCoverUrls(new Map(loadedPhotos.map((p: Photo) => [p.id, p.image?.url ?? ""])));
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

      const from = albums.findIndex((a) => a.id === activeId);
      const to = albums.findIndex((a) => a.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(albums, from, to).map((a, index) => ({ ...a, order: index }));
      const previousOrder = new Map(albums.map((a) => [a.id, a.order]));
      const toPersist = moved.filter((a) => previousOrder.get(a.id) !== a.order);

      setAlbums(moved);
      try {
        await Promise.all(toPersist.map((a) => updateAlbumOrder(a.id, a.order)));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [albums],
  );

  const togglePublished = useCallback(async (id: string, next: boolean) => {
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, published: next } : a)));
    try {
      await setAlbumPublished(id, next);
    } catch (caught) {
      // 실패 시 롤백.
      setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, published: !next } : a)));
      setError((caught as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteAlbum(id);
      setAlbums((prev) => prev.filter((a) => a.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  return { albums, coverUrls, status, error, reorder, togglePublished, remove };
};

export { useAlbumsAdmin };
