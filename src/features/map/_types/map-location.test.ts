import { describe, expect, it } from "vitest";

import { toMapLocations } from "@/features/map/_types/map-location";

import type { Photo } from "@/types/photo";

describe("toMapLocations", () => {
  it("좌표가 있는 사진만 지도에 필요한 필드로 축소한다", () => {
    const photos = [
      {
        id: "mapped",
        coords: { lat: 37.5, lng: 127 },
        place: { ko: "서울", en: "Seoul" },
        image: {
          url: "main.webp",
          path: "photos/mapped/main.webp",
          w: 2048,
          h: 1365,
          thumbnail: {
            url: "thumb.webp",
            path: "photos/mapped/thumbnails/thumb.webp",
            w: 320,
            h: 213,
          },
        },
        camera: "camera must not be serialized",
      },
      { id: "hidden", coords: null },
    ] as Photo[];

    expect(toMapLocations(photos)).toEqual([
      {
        id: "mapped",
        coords: { lat: 37.5, lng: 127 },
        place: { ko: "서울", en: "Seoul" },
        thumbnailUrl: "thumb.webp",
      },
    ]);
  });

  it("기존 사진에 썸네일이 없으면 메인 이미지로 폴백한다", () => {
    const photos = [
      {
        id: "legacy",
        coords: { lat: 37.5, lng: 127 },
        place: { ko: "서울", en: "Seoul" },
        image: { url: "main.webp", path: "photos/legacy/main.webp", w: 2048, h: 1365 },
      },
    ] as Photo[];

    expect(toMapLocations(photos)[0]?.thumbnailUrl).toBe("main.webp");
  });
});
