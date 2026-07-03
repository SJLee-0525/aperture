"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import { musicWorks } from "@/lib/firebase/music";
import type { MusicWork } from "@/types/music";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 연주 목록 상태 관리 — 로드·드래그 정렬·공개 토글·삭제.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useMusicWorksAdmin = () => {
  const [works, setWorks] = useState<MusicWork[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    musicWorks
      .list()
      .then((loaded) => {
        if (!alive) return;
        setWorks(loaded);
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

      const from = works.findIndex((w) => w.id === activeId);
      const to = works.findIndex((w) => w.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(works, from, to).map((w, index) => ({ ...w, order: index }));
      const previousOrder = new Map(works.map((w) => [w.id, w.order]));
      const toPersist = moved.filter((w) => previousOrder.get(w.id) !== w.order);

      setWorks(moved);
      try {
        await Promise.all(toPersist.map((w) => musicWorks.updateOrder(w.id, w.order)));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [works],
  );

  const togglePublished = useCallback(async (id: string, next: boolean) => {
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, published: next } : w)));
    try {
      await musicWorks.setPublished(id, next);
    } catch (caught) {
      // 실패 시 롤백.
      setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, published: !next } : w)));
      setError((caught as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await musicWorks.remove(id);
      setWorks((prev) => prev.filter((w) => w.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  return { works, status, error, reorder, togglePublished, remove };
};

export { useMusicWorksAdmin };
