import { COLLECTIONS } from "@/constants/collections";
import {
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  runQuery,
  toDate,
} from "@/lib/firebase/public/transport";
import type { Album } from "@/types/album";
import type { Coords } from "@/types/coords";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { Photo } from "@/types/photo";

type ChatPhoto = Pick<
  Photo,
  "id" | "title" | "camera" | "lens" | "place" | "tags" | "image" | "order" | "published"
>;
type ChatAlbum = Pick<Album, "id" | "title" | "subtitle" | "cover" | "order" | "published">;

const EMPTY_LOCALIZED: LocalizedText = { ko: "", en: "" };
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

const toPhoto = (id: string, data: Record<string, unknown>): Photo => ({
  id,
  title: (data.title as LocalizedText) ?? EMPTY_LOCALIZED,
  shotAt: toDate(data.shotAt),
  camera: (data.camera as string) ?? "",
  lens: (data.lens as string) ?? "",
  exif: { ...EMPTY_EXIF, ...((data.exif as Partial<Photo["exif"]>) ?? {}) },
  fileName: (data.fileName as string) ?? undefined,
  dimensions: (data.dimensions as { w: number; h: number }) ?? { w: 0, h: 0 },
  aspectRatio: (data.aspectRatio as number) ?? 1,
  place: (data.place as LocalizedText) ?? EMPTY_LOCALIZED,
  coords: (data.coords as Coords | null) ?? null,
  tags: (data.tags as string[]) ?? [],
  image: (data.image as ImageMeta) ?? EMPTY_IMAGE,
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const toAlbum = (id: string, data: Record<string, unknown>): Album => ({
  id,
  title: (data.title as LocalizedText) ?? EMPTY_LOCALIZED,
  subtitle: (data.subtitle as LocalizedText) ?? EMPTY_LOCALIZED,
  coverPhotoId: (data.coverPhotoId as string) ?? "",
  cover: (data.cover as ImageMeta | null) ?? null,
  photoIds: (data.photoIds as string[]) ?? [],
  order: (data.order as number) ?? 0,
  published: (data.published as boolean) ?? false,
});

const fetchPublishedPhotos = async (): Promise<Photo[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.PHOTOS))).map(({ id, data }) =>
    toPhoto(id, data),
  );

const fetchPublishedAlbums = async (): Promise<Album[]> =>
  (await runQuery(publishedOrderedQuery(COLLECTIONS.ALBUMS))).map(({ id, data }) =>
    toAlbum(id, data),
  );

const fetchChatPhotos = async (): Promise<ChatPhoto[]> =>
  (
    await runQuery(
      projectedPublishedOrderedQuery(COLLECTIONS.PHOTOS, [
        "title",
        "camera",
        "lens",
        "place",
        "tags",
        "image",
        "order",
        "published",
      ]),
    )
  ).map(({ id, data }) => {
    const photo = toPhoto(id, data);
    return {
      id: photo.id,
      title: photo.title,
      camera: photo.camera,
      lens: photo.lens,
      place: photo.place,
      tags: photo.tags,
      image: photo.image,
      order: photo.order,
      published: photo.published,
    };
  });

const fetchChatAlbums = async (): Promise<ChatAlbum[]> =>
  (
    await runQuery(
      projectedPublishedOrderedQuery(COLLECTIONS.ALBUMS, [
        "title",
        "subtitle",
        "cover",
        "order",
        "published",
      ]),
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

export { fetchChatAlbums, fetchChatPhotos, fetchPublishedAlbums, fetchPublishedPhotos };
