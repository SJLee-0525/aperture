import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";
import { selectRepository } from "@/lib/admin/select-repository";
import { musicMedia } from "@/lib/supabase/music";

import type { AdminListRepository } from "@/lib/admin/admin-list-repository";
import type { MusicMedia } from "@/types/music";

/** 영상은 문서가 작아 목록도 전체 필드를 쓴다 — live(sortableListCrud.list)와 같은 모양. */
type MusicMediaRepository = AdminListRepository<MusicMedia, MusicMedia>;

/** 저장 형식 버전 — `MusicMedia` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 현재 콘텐츠 소스에 맞는 영상 저장소. live 는 기존 `sortableListCrud` 산출물 그대로다.
 *
 * @returns mock 이면 브라우저 로컬, live 면 Supabase 구현.
 */
const getMusicMediaRepository = selectRepository<MusicMediaRepository>(
  () =>
    createLocalListRepository<MusicMedia, MusicMedia>({
      key: STORAGE_KEYS.ADMIN_MUSIC_MEDIA,
      version: STORE_VERSION,
      label: "영상",
      seed: async () => [...(await import("@/mocks/music")).MOCK_MUSIC_MEDIA],
      toListItem: (media) => media,
      getStorage: () => window.localStorage,
    }),
  () => musicMedia,
);

export { getMusicMediaRepository };
