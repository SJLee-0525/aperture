"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";

/**
 * 관리자 연주 목록 상태 — 저장소는 mock/live 가 갈리는 repository 경계에서 받는다.
 *
 * @returns {{ works: AdminMusicWorkListItem[] } & ReturnType<typeof useOrderedAdmin>} 목록과 공용 상태 머신.
 */
const useMusicWorksAdmin = () => {
  const { items: works, ...admin } = useOrderedAdmin(getMusicWorkRepository());
  return { works, ...admin };
};

export { useMusicWorksAdmin };
