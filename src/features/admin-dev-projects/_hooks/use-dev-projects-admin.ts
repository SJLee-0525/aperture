"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useState } from "react";

import { devProjects } from "@/lib/firebase/dev";
import type { DevProject } from "@/types/dev";

type Status = "loading" | "ready" | "error";

/**
 * 관리자 프로젝트 목록 상태 관리 — 로드·드래그 정렬·공개 토글·삭제.
 * 페이지 컴포넌트는 이 훅이 돌려주는 값만 렌더한다(SRP).
 */
const useDevProjectsAdmin = () => {
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    devProjects
      .list()
      .then((loaded) => {
        if (!alive) return;
        setProjects(loaded);
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

      const from = projects.findIndex((p) => p.id === activeId);
      const to = projects.findIndex((p) => p.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(projects, from, to).map((p, index) => ({ ...p, order: index }));
      const previousOrder = new Map(projects.map((p) => [p.id, p.order]));
      const toPersist = moved.filter((p) => previousOrder.get(p.id) !== p.order);

      setProjects(moved);
      try {
        await Promise.all(toPersist.map((p) => devProjects.updateOrder(p.id, p.order)));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [projects],
  );

  const togglePublished = useCallback(async (id: string, next: boolean) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, published: next } : p)));
    try {
      await devProjects.setPublished(id, next);
    } catch (caught) {
      // 실패 시 롤백.
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, published: !next } : p)));
      setError((caught as Error).message);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await devProjects.remove(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  return { projects, status, error, reorder, togglePublished, remove };
};

export { useDevProjectsAdmin };
