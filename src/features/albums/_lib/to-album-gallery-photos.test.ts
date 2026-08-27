import { describe, expect, it } from "vitest";

import { toAlbumGalleryPhotos } from "@/features/albums/_lib/to-album-gallery-photos";

import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

const photo = (id: string): Photo =>
  ({
    id,
    title: { ko: id, en: id },
    shotAt: new Date(0),
    camera: "X100V",
    lens: "23mm",
    exif: { aperture: "f/2", shutter: "1/250", iso: "200", focalLength: "23mm" },
    dimensions: { w: 100, h: 100 },
    aspectRatio: 1,
    place: { ko: "서울", en: "Seoul" },
    coords: { lat: 37, lng: 127 },
    tags: [],
    image: { url: `https://example.test/${id}.webp`, path: `${id}.webp`, w: 100, h: 100 },
    order: 0,
    published: true,
  }) as unknown as Photo;

const album = (photoIds: string[]): Album =>
  ({ id: "album-1", photoIds, coverPhotoId: photoIds[0] ?? "" }) as unknown as Album;

describe("toAlbumGalleryPhotos", () => {
  it("photoIds 순서를 따른다", () => {
    const result = toAlbumGalleryPhotos(album(["b", "a"]), [photo("a"), photo("b")]);

    expect(result.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("공개 목록에 없는 id 는 뺀다", () => {
    const result = toAlbumGalleryPhotos(album(["a", "missing"]), [photo("a")]);

    expect(result.map((item) => item.id)).toEqual(["a"]);
  });

  it("그리드가 쓰지 않는 필드는 내리지 않는다", () => {
    const [result] = toAlbumGalleryPhotos(album(["a"]), [photo("a")]);

    expect(result).toBeDefined();
    expect(Object.keys(result!)).not.toContain("coords");
    expect(Object.keys(result!)).not.toContain("shotAt");
    expect(Object.keys(result!.exif)).not.toContain("ev");
  });
});
