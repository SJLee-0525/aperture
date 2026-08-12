import { STORAGE_KEYS } from "@/constants/storage-keys";
import { getAlbumRepository } from "@/lib/admin/album-repository";
import { createLocalListRepository } from "@/lib/admin/mock/local-list-repository";
import { deleteMockImageFolder } from "@/lib/admin/mock/mock-image-store";
import { selectRepository } from "@/lib/admin/select-repository";
import { listPhotoItemsAdmin } from "@/lib/firebase/admin-list-rest";
import {
  createPhoto,
  deletePhoto,
  getPhotoAdmin,
  newPhotoId,
  setPhotoPublished,
  updatePhoto,
  updatePhotoOrder,
} from "@/lib/firebase/firestore";
import { removePhotoFromAlbum } from "@/lib/firebase/remove-photo-from-album";
import { deletePhotoImages } from "@/lib/firebase/storage";

import type { AdminListRepository } from "@/lib/admin/admin-list-repository";
import type { AdminPhotoListItem } from "@/types/admin";
import type { Photo } from "@/types/photo";

type PhotoRepository = AdminListRepository<Photo, AdminPhotoListItem>;

/** 저장 형식 버전 — `Photo` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 목록 행 투영 — live REST projection(`listPhotoItemsAdmin`)과 같은 필드.
 * EXIF·좌표·본문 격의 큰 필드를 빼서 목록 화면이 받는 양을 live 와 맞춘다.
 *
 * @param {Photo} photo 저장된 사진 전체.
 * @returns {AdminPhotoListItem} 목록 행에 필요한 필드만.
 */
const toListItem = ({ id, title, image, order, published }: Photo): AdminPhotoListItem => ({
  id,
  title,
  image,
  order,
  published,
});

/**
 * 사진 삭제 후 모든 앨범의 사진·커버 참조를 정리한다 — live `deletePhoto` 의 batch 정리와
 * 같은 결과를 mock 앨범 저장소 위에서 만든다(같은 순수 함수 `removePhotoFromAlbum` 공유).
 * live 처럼 앨범의 `cover` snapshot 은 건드리지 않는다.
 *
 * @param {string} photoId 삭제된 사진 ID.
 * @returns {Promise<void>} 영향받은 앨범의 갱신이 끝나면 완료된다.
 */
const removePhotoReferencesFromAlbums = async (photoId: string): Promise<void> => {
  const albums = getAlbumRepository();
  const rows = await albums.list();
  const affected = rows.filter(
    (row) => row.photoIds.includes(photoId) || row.coverPhotoId === photoId,
  );
  for (const row of affected) {
    const album = await albums.get(row.id);
    if (!album) continue;
    const { id, ...input } = { ...album, ...removePhotoFromAlbum(album, photoId) };
    await albums.update(id, input);
  }
};

/**
 * mock 구현 — 삭제 시 live 의 batch·Storage 정리에 해당하는 두 후처리를 더한다:
 * 앨범 참조 정리와 `photos/{id}` objectURL 회수.
 *
 * @returns {PhotoRepository} 브라우저 로컬 저장소에 붙은 사진 CRUD.
 */
const createMockPhotoRepository = (): PhotoRepository => {
  const base = createLocalListRepository<Photo, AdminPhotoListItem>({
    key: STORAGE_KEYS.ADMIN_PHOTOS,
    version: STORE_VERSION,
    label: "사진",
    dateFields: ["shotAt"],
    seed: async () => [...(await import("@/mocks/photos")).MOCK_PHOTOS],
    toListItem,
    getStorage: () => window.localStorage,
  });
  /**
   * 앨범 정리 직렬화 큐. 정리는 앨범 목록을 읽고(read) 고쳐 쓰는(write) 두 단계라, 연속
   * 삭제에서 뒤의 정리가 앞의 쓰기 전에 읽으면 이미 지운 사진 참조를 되살린다. 앨범
   * 저장소의 쓰기 큐는 write 만 지키므로 read-modify-write 전체를 여기서 줄 세운다.
   */
  let albumCleanupQueue: Promise<unknown> = Promise.resolve();

  return {
    ...base,
    remove: async (id) => {
      await base.remove(id);
      const cleanup = albumCleanupQueue.then(
        () => removePhotoReferencesFromAlbums(id),
        () => removePhotoReferencesFromAlbums(id),
      );
      albumCleanupQueue = cleanup.catch(() => undefined);
      await cleanup;
      deleteMockImageFolder(`photos/${id}`);
    },
  };
};

/**
 * live 구현 — 지금까지 훅이 조립하던 함수를 같은 계약으로 모은 것. 함수 자체는 바꾸지 않는다.
 * 삭제 시 Storage 이미지 정리는 기존 훅 어댑터의 동작 그대로 best-effort 다.
 *
 * @returns {PhotoRepository} Firestore 에 붙은 사진 CRUD.
 */
const createLivePhotoRepository = (): PhotoRepository => ({
  newId: newPhotoId,
  list: listPhotoItemsAdmin,
  get: getPhotoAdmin,
  create: createPhoto,
  update: updatePhoto,
  updateOrder: updatePhotoOrder,
  setPublished: setPhotoPublished,
  remove: async (id) => {
    await deletePhoto(id);
    await deletePhotoImages(id).catch(() => undefined);
  },
});

/**
 * 현재 콘텐츠 소스에 맞는 사진 저장소. 첫 호출 결과를 재사용한다.
 *
 * @returns {PhotoRepository} mock 이면 브라우저 로컬, live 면 Firestore 구현.
 */
const getPhotoRepository = selectRepository<PhotoRepository>(
  createMockPhotoRepository,
  createLivePhotoRepository,
);

export { getPhotoRepository };
