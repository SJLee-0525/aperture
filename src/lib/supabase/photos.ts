import { collectionCacheTag } from "@/constants/cache";
import { COLLECTIONS, tableFor } from "@/constants/collections";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { removePhotoFromAlbum } from "@/lib/content/remove-photo-from-album";
import { encodeListRow } from "@/lib/supabase/admin/row-codec";
import { listAlbumsAdmin } from "@/lib/supabase/albums";
import { getSupabaseClient } from "@/lib/supabase/client";
import { decodePhoto } from "@/lib/supabase/decode/photo";
import { sortableListCrud } from "@/lib/supabase/list-crud";

import type { Photo } from "@/types/photo";

const PHOTOS_CACHE_TAG = collectionCacheTag(COLLECTIONS.PHOTOS);
const ALBUMS_CACHE_TAG = collectionCacheTag(COLLECTIONS.ALBUMS);

/** 새 사진을 저장할 때 사용하는 문서 ID 제외 입력값. */
type PhotoInput = Omit<Photo, "id">;


const photosCrud = sortableListCrud<Photo>(COLLECTIONS.PHOTOS, decodePhoto, "사진", "photo");

/**
 * 새 사진 문서 ID 선발급 — Storage 경로(photos/{id}) 확정에 필요.
 *
 * @returns {string} 미리 발급한 사진 문서 ID.
 */
const newPhotoId = photosCrud.newId;

/** 관리자 사진 목록 — 초안 포함 전체, order 순. */
const listPhotosAdmin = photosCrud.list;

/** 관리자 편집용 사진 한 건. 문서가 없으면 `null`. */
const getPhotoAdmin = photosCrud.get;

/** 사진 문서를 생성하고 공개 캐시와 RAG 문서를 갱신한다. */
const createPhoto = photosCrud.create;

/** 사진 문서를 수정하고 공개 캐시와 RAG 문서를 갱신한다. */
const updatePhoto = photosCrud.update;

/** 이미지 파생본 등 일부 필드만 갱신한다. 나머지 필드는 저장된 값 그대로 남는다. */
const patchPhoto = photosCrud.patchData;

/** 드래그 정렬 결과를 RPC 1회로 저장한다. */
const updatePhotoOrders = photosCrud.updateOrder;

/** 사진의 공개 상태를 바꾸고 공개 캐시와 RAG 문서를 갱신한다. */
const setPhotoPublished = photosCrud.setPublished;

/**
 * 사진을 삭제하고 모든 앨범의 사진·커버 참조를 정리한다.
 *
 * 원자적 배치가 없어 순차 처리한다. 단계별 실패 의미:
 * 앨범 정리 실패면 사진을 지우지 않고 끝나 재시도할 수 있고, 앨범 정리 후 사진 삭제가
 * 실패하면 앨범에서만 빠진 상태가 된다(`removePhotoFromAlbum` 이 멱등이라 재삭제 가능).
 * 앨범 갱신은 참조 정리일 뿐이라 앨범 RAG 동기화는 요청하지 않는다(기존 배치와 동일).
 *
 * @param {string} id 삭제할 사진 문서 ID.
 * @returns {Promise<void>} 삭제와 RAG 동기화가 끝나면 완료된다.
 */
const deletePhoto = async (id: string): Promise<void> => {
  const albumsTable = tableFor(COLLECTIONS.ALBUMS);
  const photosTable = tableFor(COLLECTIONS.PHOTOS);
  try {
    const albums = await listAlbumsAdmin();
    const affected = albums.filter(
      (album) => album.photoIds.includes(id) || album.coverPhotoId === id,
    );
    for (const album of affected) {
      const { id: albumId, ...input } = {
        ...album,
        ...removePhotoFromAlbum(
          { cover: album.cover, coverPhotoId: album.coverPhotoId, photoIds: album.photoIds },
          id,
        ),
      };
      const { data, error } = await getSupabaseClient()
        .from(albumsTable)
        .update(encodeListRow(albumId, input))
        .eq("id", albumId)
        .select("id");
      if (error || !data?.length) throw new Error("앨범 참조 정리 실패");
    }
    // DELETE 는 RLS 가 행을 감추면 오류 없이 0행이 된다. 반환 행으로 검증한다.
    const { data, error } = await getSupabaseClient()
      .from(photosTable)
      .delete()
      .eq("id", id)
      .select("id");
    if (error || !data?.length) throw new Error("사진 삭제 실패");
  } catch {
    throw new Error("사진 삭제에 실패했습니다.");
  }
  requestPublicRevalidate(PHOTOS_CACHE_TAG, ALBUMS_CACHE_TAG);
  await requestRagSync("photo", id);
};

export {
  createPhoto,
  deletePhoto,
  getPhotoAdmin,
  listPhotosAdmin,
  newPhotoId,
  patchPhoto,
  setPhotoPublished,
  updatePhoto,
  updatePhotoOrders,
};
export type { PhotoInput };
