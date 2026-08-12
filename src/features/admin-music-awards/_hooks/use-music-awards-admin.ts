"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";

/**
 * 관리자 수상 목록 상태 — 저장소는 mock/live 가 갈리는 repository 경계에서 받는다.
 *
 * @returns {{ awards: MusicAward[] } & ReturnType<typeof useOrderedAdmin>} 목록과 공용 상태 머신.
 */
const useMusicAwardsAdmin = () => {
  const { items: awards, ...admin } = useOrderedAdmin(getMusicAwardRepository());
  return { awards, ...admin };
};

export { useMusicAwardsAdmin };
