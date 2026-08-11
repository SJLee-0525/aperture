import { COLLECTIONS } from "@/constants/collections";

import {
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  runQuery,
  toDate,
} from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";

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
 * REST API로 읽은 사진 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id Firestore 사진 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 사진 문서 필드.
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
 * REST API로 읽은 앨범 문서를 공개 페이지 모델로 변환한다.
 *
 * @param {string} id Firestore 앨범 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 앨범 문서 필드.
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
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<Photo[]>} 공개된 사진 목록.
 */
const fetchPublishedPhotos = async (options?: { fresh?: boolean }): Promise<Photo[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.PHOTOS), options)).map(({ id, data }) =>
    toPhoto(id, data),
  );

/**
 * 공개된 앨범 목록을 정렬 순서대로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<Album[]>} 공개된 앨범 목록.
 */
const fetchPublishedAlbums = async (options?: { fresh?: boolean }): Promise<Album[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.ALBUMS), options)).map(({ id, data }) =>
    toAlbum(id, data),
  );

/**
 * 채팅 검색에 필요한 공개 사진 필드만 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<ChatPhoto[]>} 채팅용 사진 목록.
 */
const fetchChatPhotos = async (options?: { fresh?: boolean }): Promise<ChatPhoto[]> =>
  (
    await runQuery(
      projectedPublishedOrderedQuery(COLLECTIONS.PHOTOS, [
        "title",
        "shotAt",
        "camera",
        "lens",
        "exif",
        "place",
        "tags",
        "image",
        "order",
        "published",
      ]),
      options,
    )
  ).map(({ id, data }) => {
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
 * 채팅 검색에 필요한 공개 앨범 필드만 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<ChatAlbum[]>} 채팅용 앨범 목록.
 */
const fetchChatAlbums = async (options?: { fresh?: boolean }): Promise<ChatAlbum[]> =>
  (
    await runQuery(
      projectedPublishedOrderedQuery(COLLECTIONS.ALBUMS, [
        "title",
        "subtitle",
        "cover",
        "order",
        "published",
      ]),
      options,
    )
  ).map(({ id, data }) => {
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
