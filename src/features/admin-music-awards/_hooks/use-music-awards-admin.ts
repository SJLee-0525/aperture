"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import { musicAwards } from "@/lib/firebase/music";
import type { MusicAward } from "@/types/music";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 수상 목록 상태 관리 — 로드·드래그 정렬·공개 토글·삭제.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useMusicAwardsAdmin = () => {
  const [awards, setAwards] = useState<MusicAward[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    musicAwards
      .list()
      .then((loaded) => {
        if (!alive) return;
        setAwards(loaded);
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

      const from = awards.findIndex((a) => a.id === activeId);
      const to = awards.findIndex((a) => a.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(awards, from, to).map((a, index) => ({ ...a, order: index }));
      const previousOrder = new Map(awards.map((a) => [a.id, a.order]));
      const toPersist = moved.filter((a) => previousOrder.get(a.id) !== a.order);

      setAwards(moved);
      try {
        await Promise.all(toPersist.map((a) => musicAwards.updateOrder(a.id, a.order)));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [awards],
  );

  const togglePublished = useCallback(async (id: string, next: boolean) => {
    setAwards((prev) => prev.map((a) => (a.id === id ? { ...a, published: next } : a)));
    try {
      await musicAwards.setPublished(id, next);
    } catch (caught) {
      // 실패 시 롤백.
      setAwards((prev) => prev.map((a) => (a.id === id ? { ...a, published: !next } : a)));
      setError((caught as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await musicAwards.remove(id);
      setAwards((prev) => prev.filter((a) => a.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  return { awards, status, error, reorder, togglePublished, remove };
};

export { useMusicAwardsAdmin };
