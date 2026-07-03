"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import { musicMedia } from "@/lib/firebase/music";
import type { MusicMedia } from "@/types/music";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 영상 목록 상태 관리 — 로드·드래그 정렬·공개 토글·삭제.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useMusicMediaAdmin = () => {
  const [media, setMedia] = useState<MusicMedia[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    musicMedia
      .list()
      .then((loaded) => {
        if (!alive) return;
        setMedia(loaded);
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

      const from = media.findIndex((m) => m.id === activeId);
      const to = media.findIndex((m) => m.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(media, from, to).map((m, index) => ({ ...m, order: index }));
      const previousOrder = new Map(media.map((m) => [m.id, m.order]));
      const toPersist = moved.filter((m) => previousOrder.get(m.id) !== m.order);

      setMedia(moved);
      try {
        await Promise.all(toPersist.map((m) => musicMedia.updateOrder(m.id, m.order)));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [media],
  );

  const togglePublished = useCallback(async (id: string, next: boolean) => {
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, published: next } : m)));
    try {
      await musicMedia.setPublished(id, next);
    } catch (caught) {
      // 실패 시 롤백.
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, published: !next } : m)));
      setError((caught as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await musicMedia.remove(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  return { media, status, error, reorder, togglePublished, remove };
};

export { useMusicMediaAdmin };
