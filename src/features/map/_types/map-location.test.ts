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
        image: { url: "thumb.webp", path: "photos/mapped", w: 100, h: 100 },
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
});
