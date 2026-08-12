"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";
import { getAlbumRepository } from "@/lib/admin/album-repository";

/**
 * 관리자 앨범 목록 상태 — 저장소는 mock/live 가 갈리는 repository 경계에서 받는다.
 *
 * @returns {{ albums: AdminAlbumListItem[] } & ReturnType<typeof useOrderedAdmin>} 목록과 공용 상태 머신.
 */
const useAlbumsAdmin = () => {
  const { items: albums, ...admin } = useOrderedAdmin(getAlbumRepository());
  return { albums, ...admin };
};

export { useAlbumsAdmin };
