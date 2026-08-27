import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { UploadResult } from "@/features/image-upload/_hooks/use-image-upload";
import type { PhotoInput } from "@/lib/supabase/photos";
import type { Coords } from "@/types/coords";
import type { Photo } from "@/types/photo";

const createEmptyPhotoInput = (): PhotoInput => ({
  title: EMPTY_TEXT,
  shotAt: new Date(),
  camera: "",
  lens: "",
  exif: {
    aperture: "",
    shutter: "",
    iso: "",
    focalLength: "",
    ev: "",
    wb: "",
    metering: "",
    flash: "",
  },
  fileName: undefined,
  dimensions: { w: 0, h: 0 },
  aspectRatio: 1,
  place: EMPTY_TEXT,
  coords: null,
  tags: [],
  image: { url: "", path: "", w: 0, h: 0 },
  order: 0,
  published: false,
});

const createPhotoInput = (photo?: Photo): PhotoInput => {
  if (!photo) return createEmptyPhotoInput();
  const { id: _id, ...input } = photo;
  void _id;
  return input;
};

const applyUploadResult = (input: PhotoInput, result: UploadResult): PhotoInput => ({
  ...input,
  image: result.image,
  dimensions: result.dimensions,
  aspectRatio: result.aspectRatio,
  camera: result.exif.camera,
  lens: result.exif.lens,
  fileName: result.exif.fileName,
  exif: {
    aperture: result.exif.aperture,
    shutter: result.exif.shutter,
    iso: result.exif.iso,
    focalLength: result.exif.focalLength,
    ev: result.exif.ev,
    wb: result.exif.wb,
    metering: result.exif.metering,
    flash: result.exif.flash,
  },
  shotAt: result.exif.shotAt ?? input.shotAt,
  coords: result.exif.coords ?? input.coords,
});

/**
 * 폼의 위·경도 문자열을 좌표로 바꾼다.
 *
 * `Number.isFinite` 로 거르는 이유는 `Number("Infinity")` 가 `NaN` 이 아니기 때문이다.
 * 범위를 벗어난 값은 지도에서 엉뚱한 곳에 찍히거나 투영 계산을 깨뜨린다.
 *
 * @returns 비었거나 좌표로 읽을 수 없으면 `null`.
 */
const parseCoords = (lat: string, lng: string): Coords | null => {
  if (lat.trim() === "" || lng.trim() === "") return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  if (Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180) return null;
  return { lat: parsedLat, lng: parsedLng };
};


/** 카메라·렌즈는 관리자가 직접 적거나 EXIF 에서 오는 자유 입력이라 저장 전에 공백을 턴다. */
const preparePhotoInput = (form: PhotoInput): PhotoInput => ({
  ...form,
  camera: form.camera.trim(),
  lens: form.lens.trim(),
});

export { applyUploadResult, createPhotoInput, parseCoords, preparePhotoInput };
