import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";
import { selectRepository } from "@/lib/admin/select-repository";
import { listAlbumItemsAdmin } from "@/lib/supabase/admin-list";
import {
  createAlbum,
  deleteAlbum,
  getAlbumAdmin,
  newAlbumId,
  setAlbumPublished,
  updateAlbum,
  updateAlbumOrders,
} from "@/lib/supabase/albums";

import type { AdminListRepository } from "@/lib/admin/admin-list-repository";
import type { AdminAlbumListItem } from "@/types/admin";
import type { Album } from "@/types/album";

type AlbumRepository = AdminListRepository<Album, AdminAlbumListItem>;

/** 저장 형식 버전 — `Album` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 목록 행 투영 — live REST projection(`listAlbumItemsAdmin`)과 같은 필드.
 * 앨범은 목록 화면이 사진 수·커버까지 그리므로 참조 배열을 그대로 담는다.
 *
 * @param {Album} album 저장된 앨범 전체.
 * @returns {AdminAlbumListItem} 목록 행에 필요한 필드만.
 */
const toListItem = ({
  id,
  title,
  coverPhotoId,
  cover,
  photoIds,
  order,
  published,
}: Album): AdminAlbumListItem => ({ id, title, coverPhotoId, cover, photoIds, order, published });

/**
 * live 구현 — 지금까지 훅이 조립하던 함수를 같은 계약으로 모은 것. 함수 자체는 바꾸지 않는다.
 *
 * @returns {AlbumRepository} Firestore 에 붙은 앨범 CRUD.
 */
const createLiveAlbumRepository = (): AlbumRepository => ({
  newId: newAlbumId,
  list: listAlbumItemsAdmin,
  get: getAlbumAdmin,
  create: createAlbum,
  update: updateAlbum,
  updateOrder: updateAlbumOrders,
  setPublished: setAlbumPublished,
  remove: deleteAlbum,
});

/**
 * 현재 콘텐츠 소스에 맞는 앨범 저장소. 첫 호출 결과를 재사용한다.
 *
 * @returns {AlbumRepository} mock 이면 브라우저 로컬, live 면 Firestore 구현.
 */
const getAlbumRepository = selectRepository<AlbumRepository>(
  () =>
    createLocalListRepository<Album, AdminAlbumListItem>({
      key: STORAGE_KEYS.ADMIN_ALBUMS,
      version: STORE_VERSION,
      label: "앨범",
      seed: async () => [...(await import("@/mocks/albums")).MOCK_ALBUMS],
      toListItem,
      getStorage: () => window.localStorage,
    }),
  createLiveAlbumRepository,
);

export { getAlbumRepository };
