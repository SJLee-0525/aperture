import { COLLECTIONS } from "@/constants/collections";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";
import { listCrud } from "@/lib/supabase/list-crud";

import type { Album } from "@/types/album";

/** 새 앨범을 저장할 때 사용하는 문서 ID 제외 입력값. */
type AlbumInput = Omit<Album, "id">;

/**
 * 병합된 앨범 행의 누락 필드를 기본값으로 채워 `Album`으로 변환한다.
 *
 * @param {string} id 앨범 문서 ID.
 * @param {Record<string, unknown>} data 병합된 앨범 문서 필드.
 * @returns {Album} 관리자 화면에서 사용하는 앨범 모델.
 */
const toAlbum = (id: string, data: Record<string, unknown>): Album => ({
  id,
  title: (data.title as Album["title"]) ?? EMPTY_TEXT,
  subtitle: (data.subtitle as Album["subtitle"]) ?? EMPTY_TEXT,
  coverPhotoId: (data.coverPhotoId as string) ?? "",
  cover: (data.cover as Album["cover"]) ?? null,
  photoIds: (data.photoIds as string[]) ?? [],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const albumsCrud = listCrud<Album>(COLLECTIONS.ALBUMS, toAlbum, "앨범", "album");

/** 새 앨범 문서 ID 선발급. */
const newAlbumId = albumsCrud.newId;
/** 관리자 앨범 목록 — 초안 포함 전체, order 순. */
const listAlbumsAdmin = albumsCrud.list;
/** 관리자 편집용 앨범 한 건. 문서가 없으면 `null`. */
const getAlbumAdmin = albumsCrud.get;
/** 미리 발급한 ID로 앨범을 생성하고 공개 캐시와 RAG 문서를 갱신한다. */
const createAlbum = albumsCrud.create;
/** 앨범 필드 전체를 수정하고 공개 캐시와 RAG 문서를 갱신한다. */
const updateAlbum = albumsCrud.update;
/** 드래그 정렬 결과를 RPC 1회로 저장한다. */
const updateAlbumOrders = albumsCrud.updateOrder;
/** 앨범의 공개 상태를 바꾸고 공개 캐시와 RAG 문서를 갱신한다. */
const setAlbumPublished = albumsCrud.setPublished;
/** 앨범 삭제 — 사진은 지우지 않는다(앨범은 참조만 보유). */
const deleteAlbum = albumsCrud.remove;

export {
  createAlbum,
  deleteAlbum,
  getAlbumAdmin,
  listAlbumsAdmin,
  newAlbumId,
  setAlbumPublished,
  updateAlbum,
  updateAlbumOrders,
};
export type { AlbumInput };
