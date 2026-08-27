"use client";

import { useEffect } from "react";

import { useDetailQuerySession } from "@/hooks/use-detail-query-session";

import type { DetailQueryKey } from "@/constants/routes";

/**
 * `useDetailQuerySession` 에 항목 해석을 얹은 상세 모달 상태.
 * 사진 상세는 목록을 들고 있지 않아 세션만 직접 쓴다.
 *
 * @returns active 는 query id 와 일치하는 항목. 없으면 null 이고 query 는 지워진다.
 */
const useQueryModal = <T extends { id: string }>(param: DetailQueryKey, items: T[]) => {
  const { activeId, close, goto } = useDetailQuerySession(param);
  const active = activeId ? (items.find((item) => item.id === activeId) ?? null) : null;

  // 비공개로 바뀐 항목의 공유 링크처럼 매칭되는 항목이 없으면 모달이 열리지 않는데 query 는
  // URL 에 남는다. 목록만 보이는 화면에서 왜 안 열리는지 알 수 없고 뒤로가기도 어긋난다.
  useEffect(() => {
    if (activeId == null || active != null) return;
    goto(null);
  }, [activeId, active, goto]);

  return { active, open: active != null, select: goto, close };
};

export { useQueryModal };
