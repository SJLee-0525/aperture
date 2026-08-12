"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";

/**
 * 관리자 영상 목록 상태 — 저장소는 mock/live 가 갈리는 repository 경계에서 받는다.
 *
 * @returns {{ media: MusicMedia[] } & ReturnType<typeof useOrderedAdmin>} 목록과 공용 상태 머신.
 */
const useMusicMediaAdmin = () => {
  const { items: media, ...admin } = useOrderedAdmin(getMusicMediaRepository());
  return { media, ...admin };
};

export { useMusicMediaAdmin };
