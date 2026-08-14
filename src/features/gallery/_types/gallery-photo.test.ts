import { describe, expect, it } from "vitest";

import { toGalleryPhotos } from "@/types/gallery-photo";

import type { Photo } from "@/types/photo";

describe("toGalleryPhotos", () => {
  it("타일과 필터에 필요한 필드만 남긴다", () => {
    const source = {
      id: "photo",
      title: { ko: "제목", en: "Title" },
      camera: "Camera",
      lens: "Lens",
      place: { ko: "서울", en: "Seoul" },
      tags: ["tag"],
      aspectRatio: 1.5,
      image: { url: "photo.webp", path: "photos/photo", w: 1200, h: 800 },
      exif: {
        aperture: "f/4",
        shutter: "1/250",
        iso: "100",
        focalLength: "70 mm",
        ev: "0 EV",
      },
      shotAt: new Date(),
      coords: { lat: 37.5, lng: 127 },
    } as Photo;

    expect(toGalleryPhotos([source])).toEqual([
      {
        id: "photo",
        title: source.title,
        camera: "Camera",
        lens: "Lens",
        place: source.place,
        tags: ["tag"],
        aspectRatio: 1.5,
        image: source.image,
        exif: {
          aperture: "f/4",
          shutter: "1/250",
          iso: "100",
          focalLength: "70 mm",
        },
      },
    ]);
  });
});
