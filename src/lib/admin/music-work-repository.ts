import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";
import { deleteMockImageFolder } from "@/lib/admin/mock/mock-image-store";
import { selectRepository } from "@/lib/admin/select-repository";
import { listMusicWorkItemsAdmin } from "@/lib/firebase/admin-list-rest";
import { musicWorks } from "@/lib/firebase/music";

import type { AdminListRepository } from "@/lib/admin/admin-list-repository";
import type { AdminMusicWorkListItem } from "@/types/admin";
import type { MusicWork } from "@/types/music";

type MusicWorkRepository = AdminListRepository<MusicWork, AdminMusicWorkListItem>;

/** 저장 형식 버전 — `MusicWork` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 목록 행 투영 — live REST projection(`listMusicWorkItemsAdmin`)과 같은 필드.
 *
 * @param {MusicWork} work 저장된 연주 전체.
 * @returns {AdminMusicWorkListItem} 목록 행에 필요한 필드만.
 */
const toListItem = ({
  id,
  title,
  performedAt,
  poster,
  order,
  published,
}: MusicWork): AdminMusicWorkListItem => ({ id, title, performedAt, poster, order, published });

/**
 * mock 구현 — 삭제 시 live `musicWorks.remove` 의 Storage 정리에 해당하는
 * `music/{id}` objectURL 회수를 더한다.
 *
 * @returns {MusicWorkRepository} 브라우저 로컬 저장소에 붙은 연주 CRUD.
 */
const createMockMusicWorkRepository = (): MusicWorkRepository => {
  const base = createLocalListRepository<MusicWork, AdminMusicWorkListItem>({
    key: STORAGE_KEYS.ADMIN_MUSIC_WORKS,
    version: STORE_VERSION,
    label: "연주",
    dateFields: ["performedAt"],
    seed: async () => [...(await import("@/mocks/music")).MOCK_MUSIC_WORKS],
    toListItem,
    getStorage: () => window.localStorage,
  });
  return {
    ...base,
    remove: async (id) => {
      await base.remove(id);
      deleteMockImageFolder(`music/${id}`);
    },
  };
};

/**
 * 현재 콘텐츠 소스에 맞는 연주 저장소. live 는 기존 `listCrud` 산출물에 REST 목록만 얹은,
 * 지금까지 훅이 조립하던 어댑터 그대로다.
 *
 * @returns {MusicWorkRepository} mock 이면 브라우저 로컬, live 면 Firestore 구현.
 */
const getMusicWorkRepository = selectRepository<MusicWorkRepository>(
  createMockMusicWorkRepository,
  () => ({ ...musicWorks, list: listMusicWorkItemsAdmin }),
);

export { getMusicWorkRepository };
