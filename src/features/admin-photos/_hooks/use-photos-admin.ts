"use client";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { getPhotoRepository } from "@/lib/admin/photo-repository";

/**
 * 관리자 사진 목록 상태 — 정렬·공개 토글·삭제는 공용 상태 머신에 맡기고,
 * 저장소는 콘텐츠 소스에 따라 mock/live 가 갈리는 repository 경계에서 받는다.
 * repository getter 는 memoize 되어 렌더마다 어댑터가 바뀌지 않는다.
 *
 * @returns {{ photos: AdminPhotoListItem[] } & ReturnType<typeof useOrderedAdmin>} 목록과 공용 상태 머신.
 */
const usePhotosAdmin = () => {
  const { items: photos, ...admin } = useOrderedAdmin(getPhotoRepository());
  return { photos, ...admin };
};

export { usePhotosAdmin };
