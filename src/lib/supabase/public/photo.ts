import { COLLECTIONS } from "@/constants/collections";
import { asText } from "@/lib/i18n/as-text";
import { selectPublished, toDate } from "@/lib/supabase/public/transport";

import type { Album } from "@/types/album";
import type { Coords } from "@/types/coords";
import type { ImageMeta } from "@/types/image";
import type { Photo } from "@/types/photo";

type ChatPhoto = Pick<
  Photo,
  | "id"
  | "title"
  | "shotAt"
  | "camera"
  | "lens"
  | "exif"
  | "place"
  | "tags"
  | "image"
  | "order"
  | "published"
>;
type ChatAlbum = Pick<Album, "id" | "title" | "subtitle" | "cover" | "order" | "published">;

const EMPTY_IMAGE: ImageMeta = { url: "", path: "", w: 0, h: 0 };
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

/**
 * PostgREST 행에서 병합된 사진 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id 문서 ID.
 * @param {Record<string, unknown>} data 병합된 사진 문서 필드.
 * @returns {Photo} 날짜, EXIF와 다국어 필드가 정규화된 사진 모델.
 */
const toPhoto = (id: string, data: Record<string, unknown>): Photo => ({
  id,
  title: asText(data.title),
  shotAt: toDate(data.shotAt),
  camera: (data.camera as string) ?? "",
  lens: (data.lens as string) ?? "",
  exif: { ...EMPTY_EXIF, ...((data.exif as Partial<Photo["exif"]>) ?? {}) },
  fileName: (data.fileName as string) ?? undefined,
  dimensions: (data.dimensions as { w: number; h: number }) ?? { w: 0, h: 0 },
  aspectRatio: (data.aspectRatio as number) ?? 1,
  place: asText(data.place),
  coords: (data.coords as Coords | null) ?? null,
  tags: (data.tags as string[]) ?? [],
  image: (data.image as ImageMeta) ?? EMPTY_IMAGE,
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * PostgREST 행에서 병합된 앨범 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id 문서 ID.
 * @param {Record<string, unknown>} data 병합된 앨범 문서 필드.
 * @returns {Album} 기본값과 다국어 필드가 정규화된 앨범 모델.
 */
const toAlbum = (id: string, data: Record<string, unknown>): Album => ({
  id,
  title: asText(data.title),
  subtitle: asText(data.subtitle),
  coverPhotoId: (data.coverPhotoId as string) ?? "",
  cover: (data.cover as ImageMeta | null) ?? null,
  photoIds: (data.photoIds as string[]) ?? [],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

/**
 * 공개된 사진 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<Photo[]>} 공개된 사진 목록.
 */
const fetchPublishedPhotos = async (options?: { fresh?: boolean }): Promise<Photo[]> =>
  (await selectPublished(COLLECTIONS.PHOTOS, options)).map(({ id, data }) => toPhoto(id, data));

/**
 * 공개된 앨범 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<Album[]>} 공개된 앨범 목록.
 */
const fetchPublishedAlbums = async (options?: { fresh?: boolean }): Promise<Album[]> =>
  (await selectPublished(COLLECTIONS.ALBUMS, options)).map(({ id, data }) => toAlbum(id, data));

/**
 * 채팅 검색용 공개 사진 목록. PostgREST 는 jsonb 부분 선택이 번거로워 행 전체를 받고
 * 도메인 투영만 유지한다 — 행 수백 개 규모라 전송량 차이가 무시할 수준이다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatPhoto[]>} 채팅용 사진 목록.
 */
const fetchChatPhotos = async (options?: { fresh?: boolean }): Promise<ChatPhoto[]> =>
  (await selectPublished(COLLECTIONS.PHOTOS, options)).map(({ id, data }) => {
    const photo = toPhoto(id, data);
    return {
      id: photo.id,
      title: photo.title,
      shotAt: photo.shotAt,
      camera: photo.camera,
      lens: photo.lens,
      exif: photo.exif,
      place: photo.place,
      tags: photo.tags,
      image: photo.image,
      order: photo.order,
      published: photo.published,
    };
  });

/**
 * 채팅 검색용 공개 앨범 목록. 투영 방식은 `fetchChatPhotos` 와 같다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatAlbum[]>} 채팅용 앨범 목록.
 */
const fetchChatAlbums = async (options?: { fresh?: boolean }): Promise<ChatAlbum[]> =>
  (await selectPublished(COLLECTIONS.ALBUMS, options)).map(({ id, data }) => {
    const album = toAlbum(id, data);
    return {
      id: album.id,
      title: album.title,
      subtitle: album.subtitle,
      cover: album.cover,
      order: album.order,
      published: album.published,
    };
  });

export {
  fetchChatAlbums,
  fetchChatPhotos,
  fetchPublishedAlbums,
  fetchPublishedPhotos,
  toAlbum,
  toPhoto,
};
export type { ChatAlbum, ChatPhoto };
