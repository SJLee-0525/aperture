import { COLLECTIONS } from "@/constants/collections";
import { decodeAlbum, decodePhoto } from "@/lib/supabase/decode/photo";
import { selectPublished } from "@/lib/supabase/public/transport";

import type { Album } from "@/types/album";
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

/**
 * 공개 사진 모델. 사진에는 저장된 외부 주소가 없어 공개용 정화가 따로 없다.
 * 정규화 규칙은 관리자 경로와 같은 `decodePhoto` 한 벌이다.
 */
const toPhoto = decodePhoto;

/** 공개 앨범 모델. 사진과 같은 이유로 정화 계층이 없다. */
const toAlbum = decodeAlbum;

/**
 * 공개된 사진 목록을 정렬 순서대로 읽는다.
 *
 * @param [options] 공개 데이터 조회 옵션.
 * @returns 공개된 사진 목록.
 */
const fetchPublishedPhotos = async (options?: { fresh?: boolean }): Promise<Photo[]> =>
  (await selectPublished(COLLECTIONS.PHOTOS, options)).map(({ id, data }) => toPhoto(id, data));

/**
 * 공개된 앨범 목록을 정렬 순서대로 읽는다.
 *
 * @param [options] 공개 데이터 조회 옵션.
 * @returns 공개된 앨범 목록.
 */
const fetchPublishedAlbums = async (options?: { fresh?: boolean }): Promise<Album[]> =>
  (await selectPublished(COLLECTIONS.ALBUMS, options)).map(({ id, data }) => toAlbum(id, data));

/**
 * 채팅 검색용 공개 사진 목록. PostgREST 는 jsonb 부분 선택이 번거로워 행 전체를 받고
 * 도메인 투영만 유지한다 — 행 수백 개 규모라 전송량 차이가 무시할 수준이다.
 *
 * @param [options] 공개 데이터 조회 옵션.
 * @returns 채팅용 사진 목록.
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
 * @param [options] 공개 데이터 조회 옵션.
 * @returns 채팅용 앨범 목록.
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
