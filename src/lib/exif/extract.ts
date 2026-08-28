import { instantFromSiteWallClock } from "@/lib/format/site-time-zone";

import type { Coords } from "@/types/coords";

/** exifr 로 추출·정규화한 값 — 관리자 폼 자동 채움용(이후 수동 수정 가능). */
type ExtractedExif = {
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: string;
  focalLength: string;
  ev: string;
  wb: string;
  metering: string;
  flash: string;
  shotAt: Date | null;
  coords: Coords | null;
  fileName: string;
};

const fmtAperture = (f?: number): string => (f == null ? "" : `f/${f}`);

const fmtShutter = (t?: number): string => {
  if (t == null) return "";
  if (t >= 1) return `${t}s`;
  return `1/${Math.round(1 / t)}`;
};

const fmtFocal = (fl?: number): string => (fl == null ? "" : `${Math.round(fl)} mm`);

const fmtEv = (ev?: number): string => {
  if (ev == null) return "";
  const rounded = Math.round(ev * 10) / 10;
  const sign = rounded < 0 ? "−" : rounded > 0 ? "+" : "";
  return `${sign}${Math.abs(rounded)} EV`;
};

const asString = (value: unknown): string =>
  value == null ? "" : typeof value === "string" ? value : String(value);

/**
 * EXIF 촬영일시를 사이트 기준 타임존의 인스턴트로 만든다.
 *
 * exifr 는 `DateTimeOriginal` 을 실행 환경의 로컬 타임존으로 해석한 Date 로 돌려준다.
 * 그 값을 그대로 저장하면 같은 사진이라도 업로드한 기기의 타임존에 따라 다른 인스턴트가
 * 된다. 로컬 벽시계 성분만 꺼내 사이트 기준으로 다시 해석해 업로드 기기 의존을 없앤다.
 *
 * @param value exifr 가 돌려준 `DateTimeOriginal`.
 * @returns 사이트 타임존으로 해석한 촬영일시. 값이 없으면 `null`.
 */
const toSiteInstant = (value: unknown): Date | null => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return instantFromSiteWallClock({
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
    hour: value.getHours(),
    minute: value.getMinutes(),
    second: value.getSeconds(),
  });
};

/**
 * ★ 압축 前 원본에서 EXIF·GPS 를 읽는다 (압축하면 메타데이터가 날아감).
 * 카메라/렌즈 이름은 EXIF 원문(SONY / ILCE-7M4) 그대로 — 관리자가 다듬는다.
 * exifr는 파일 선택 시점에 동적 로드 — 관리자 폼 진입만으로는 번들에 싣지 않는다.
 */
const extractExif = async (file: File): Promise<ExtractedExif> => {
  let tags: Record<string, unknown> = {};
  try {
    const { default: exifr } = await import("exifr");
    tags = (await exifr.parse(file, { tiff: true, exif: true, gps: true })) ?? {};
  } catch {
    tags = {};
  }

  const make = asString(tags.Make).trim();
  const model = asString(tags.Model).trim();
  const camera = [make, model].filter(Boolean).join(" ");

  const lat = tags.latitude as number | undefined;
  const lng = tags.longitude as number | undefined;
  const coords: Coords | null =
    typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;

  const shotAt = toSiteInstant(tags.DateTimeOriginal);

  return {
    camera,
    lens: asString(tags.LensModel).trim(),
    aperture: fmtAperture(tags.FNumber as number | undefined),
    shutter: fmtShutter(tags.ExposureTime as number | undefined),
    iso: asString(tags.ISO),
    focalLength: fmtFocal(tags.FocalLength as number | undefined),
    ev: fmtEv(tags.ExposureCompensation as number | undefined),
    wb: asString(tags.WhiteBalance),
    metering: asString(tags.MeteringMode),
    flash: asString(tags.Flash),
    shotAt,
    coords,
    fileName: file.name,
  };
};

export { extractExif };
export type { ExtractedExif };
