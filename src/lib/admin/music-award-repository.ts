import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";
import { selectRepository } from "@/lib/admin/select-repository";
import { musicAwards } from "@/lib/supabase/music";

import type { AdminListRepository } from "@/lib/admin/admin-list-repository";
import type { MusicAward } from "@/types/music";

/** 수상은 문서가 작아 목록도 전체 필드를 쓴다 — live(sortableListCrud.list)와 같은 모양. */
type MusicAwardRepository = AdminListRepository<MusicAward, MusicAward>;

/** 저장 형식 버전 — `MusicAward` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 현재 콘텐츠 소스에 맞는 수상 저장소. live 는 기존 `sortableListCrud` 산출물 그대로다.
 *
 * @returns mock 이면 브라우저 로컬, live 면 Supabase 구현.
 */
const getMusicAwardRepository = selectRepository<MusicAwardRepository>(
  () =>
    createLocalListRepository<MusicAward, MusicAward>({
      key: STORAGE_KEYS.ADMIN_MUSIC_AWARDS,
      version: STORE_VERSION,
      label: "수상",
      seed: async () => [...(await import("@/mocks/music")).MOCK_MUSIC_AWARDS],
      toListItem: (award) => award,
      getStorage: () => window.localStorage,
    }),
  () => musicAwards,
);

export { getMusicAwardRepository };
