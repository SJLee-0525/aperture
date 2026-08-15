import { collectionCacheTag } from "@/constants/cache";
import { COLLECTIONS, SUPABASE_COLLECTIONS } from "@/constants/collections";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { removePhotoFromAlbum } from "@/lib/firebase/remove-photo-from-album";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";
import { encodeListRow } from "@/lib/supabase/admin/row-codec";
import { listAlbumsAdmin } from "@/lib/supabase/albums";
import { getSupabaseClient } from "@/lib/supabase/client";
import { listCrud } from "@/lib/supabase/list-crud";

import type { Photo } from "@/types/photo";

const PHOTOS_CACHE_TAG = collectionCacheTag(COLLECTIONS.PHOTOS);
const ALBUMS_CACHE_TAG = collectionCacheTag(COLLECTIONS.ALBUMS);

/** 새 사진을 저장할 때 사용하는 문서 ID 제외 입력값. */
type PhotoInput = Omit<Photo, "id">;

const EMPTY_EXIF: Photo["exif"] = {
  aperture: "",
  shutter: "",
  iso: "",
  focalLength: "",
  ev: "",
  wb: "",
  metering: "",
  flash: "",
};

const toShotAt = (value: unknown): Date => {
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return value instanceof Date ? value : new Date(0);
};

/**
 * 병합된 사진 행의 날짜와 누락 필드를 관리자 편집 모델에 맞게 정규화한다.
 *
 * @param {string} id 사진 문서 ID.
 * @param {Record<string, unknown>} data 병합된 사진 문서 필드.
 * @returns {Photo} 관리자 화면에서 사용하는 사진 모델.
 */
const toPhoto = (id: string, data: Record<string, unknown>): Photo => ({
  id,
  title: (data.title as Photo["title"]) ?? EMPTY_TEXT,
  shotAt: toShotAt(data.shotAt),
  camera: (data.camera as string) ?? "",
  lens: (data.lens as string) ?? "",
  exif: { ...EMPTY_EXIF, ...((data.exif as Partial<Photo["exif"]>) ?? {}) },
  fileName: (data.fileName as string) ?? undefined,
  dimensions: (data.dimensions as Photo["dimensions"]) ?? { w: 0, h: 0 },
  aspectRatio: (data.aspectRatio as number) ?? 1,
  place: (data.place as Photo["place"]) ?? EMPTY_TEXT,
  coords: (data.coords as Photo["coords"]) ?? null,
  tags: (data.tags as string[]) ?? [],
  image: data.image as Photo["image"],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const photosCrud = listCrud<Photo>(COLLECTIONS.PHOTOS, toPhoto, "사진", "photo");

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
  const albumsTable = SUPABASE_COLLECTIONS[COLLECTIONS.ALBUMS]?.table ?? "albums";
  const photosTable = SUPABASE_COLLECTIONS[COLLECTIONS.PHOTOS]?.table ?? "photos";
  try {
    const albums = await listAlbumsAdmin();
    const affected = albums.filter(
      (album) => album.photoIds.includes(id) || album.coverPhotoId === id,
    );
    for (const album of affected) {
      const { id: albumId, ...input } = {
        ...album,
        ...removePhotoFromAlbum(
          { coverPhotoId: album.coverPhotoId, photoIds: album.photoIds },
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
    const { error } = await getSupabaseClient().from(photosTable).delete().eq("id", id);
    if (error) throw new Error("사진 삭제 실패");
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
  setPhotoPublished,
  updatePhoto,
  updatePhotoOrders,
};
export type { PhotoInput };
