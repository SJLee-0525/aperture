import {
  readBoolean,
  readDate,
  readImage,
  readImageOrNull,
  readNumber,
  readString,
  readStringArray,
  readText,
} from "@/lib/supabase/decode/field";

import type { Album } from "@/types/album";
import type { Coords } from "@/types/coords";
import type { Photo } from "@/types/photo";

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

const readExif = (value: unknown): Photo["exif"] => {
  if (typeof value !== "object" || value === null) return EMPTY_EXIF;
  const raw = value as Record<string, unknown>;
  return {
    aperture: readString(raw.aperture),
    shutter: readString(raw.shutter),
    iso: readString(raw.iso),
    focalLength: readString(raw.focalLength),
    ev: readString(raw.ev),
    wb: readString(raw.wb),
    metering: readString(raw.metering),
    flash: readString(raw.flash),
  };
};

const readCoords = (value: unknown): Coords | null => {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.lat !== "number" || typeof raw.lng !== "number") return null;
  return { lat: raw.lat, lng: raw.lng };
};

/**
 * 병합된 사진 행을 도메인 모델로 바꾼다. 공개와 관리자가 같은 함수를 쓴다.
 *
 * @param {string} id 사진 문서 ID.
 * @param {Record<string, unknown>} data 병합된 사진 문서 필드.
 * @returns {Photo}
 */
const decodePhoto = (id: string, data: Record<string, unknown>): Photo => {
  const fileName = readString(data.fileName);
  return {
    id,
    title: readText(data.title),
    shotAt: readDate(data.shotAt),
    camera: readString(data.camera),
    lens: readString(data.lens),
    exif: readExif(data.exif),
    ...(fileName ? { fileName } : {}),
    dimensions: {
      w: readNumber((data.dimensions as Record<string, unknown> | undefined)?.w),
      h: readNumber((data.dimensions as Record<string, unknown> | undefined)?.h),
    },
    aspectRatio: readNumber(data.aspectRatio, 1),
    place: readText(data.place),
    coords: readCoords(data.coords),
    tags: readStringArray(data.tags),
    image: readImage(data.image),
    order: readNumber(data.order),
    published: readBoolean(data.published),
  };
};

/**
 * 병합된 앨범 행을 도메인 모델로 바꾼다.
 *
 * @param {string} id 앨범 문서 ID.
 * @param {Record<string, unknown>} data 병합된 앨범 문서 필드.
 * @returns {Album}
 */
const decodeAlbum = (id: string, data: Record<string, unknown>): Album => ({
  id,
  title: readText(data.title),
  subtitle: readText(data.subtitle),
  coverPhotoId: readString(data.coverPhotoId),
  cover: readImageOrNull(data.cover),
  photoIds: readStringArray(data.photoIds),
  order: readNumber(data.order),
  published: readBoolean(data.published),
});

export { decodeAlbum, decodePhoto };
