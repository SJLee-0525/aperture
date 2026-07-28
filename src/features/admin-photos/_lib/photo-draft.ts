import type { UploadResult } from "@/features/image-upload/_hooks/use-image-upload";
import type { PhotoInput } from "@/lib/firebase/firestore";
import type { Coords } from "@/types/coords";
import type { Photo } from "@/types/photo";

const createEmptyPhotoInput = (): PhotoInput => ({
  title: { ko: "", en: "" },
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
  place: { ko: "", en: "" },
  coords: null,
  tags: [],
  image: { url: "", path: "", w: 0, h: 0 },
  order: 0,
  published: false,
});

const createPhotoInput = (photo?: Photo): PhotoInput => {
  if (!photo) return createEmptyPhotoInput();
  const { id: _id, likes: _likes, ...input } = photo;
  void _id;
  void _likes;
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

const parseCoords = (lat: string, lng: string): Coords | null => {
  if (lat.trim() === "" || lng.trim() === "") return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
  return { lat: parsedLat, lng: parsedLng };
};

const validatePhotoInput = (input: PhotoInput): string | null => {
  if (!input.title.ko.trim()) return "제목(한국어)을 입력하세요.";
  if (!input.image.url) return "이미지를 먼저 업로드하세요.";
  return null;
};

export { applyUploadResult, createPhotoInput, parseCoords, validatePhotoInput };
