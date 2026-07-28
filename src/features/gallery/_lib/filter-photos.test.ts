import { describe, expect, it } from "vitest";

import { ALL, filterPhotos } from "@/features/gallery/_lib/filter-photos";
import type { Photo } from "@/types/photo";

const photo = (overrides: Partial<Photo> = {}): Photo => ({
  id: "photo-1",
  title: { ko: "새벽의 항구", en: "Harbor at Dawn" },
  shotAt: new Date("2026-01-01T00:00:00Z"),
  camera: "Sony A7 IV",
  lens: "FE 35mm F1.4",
  exif: {
    aperture: "f/1.4",
    shutter: "1/250",
    iso: "100",
    focalLength: "35 mm",
    ev: "0 EV",
    wb: "Auto",
    metering: "Pattern",
    flash: "Off",
  },
  dimensions: { w: 6000, h: 4000 },
  aspectRatio: 1.5,
  place: { ko: "부산", en: "Busan" },
  coords: { lat: 35.1796, lng: 129.0756 },
  tags: ["dawn", "sea"],
  image: { url: "/photo.webp", path: "photos/photo.webp", w: 2048, h: 1365 },
  likes: 0,
  order: 0,
  published: true,
  ...overrides,
});

const allFilters = {
  tag: ALL,
  query: "",
  camera: ALL,
  focalMin: 16,
  focalMax: 300,
};

describe("filterPhotos", () => {
  it("선택한 태그를 가진 사진만 보여준다", () => {
    const photos = [photo(), photo({ id: "photo-2", tags: ["night"] })];

    expect(filterPhotos(photos, { ...allFilters, tag: "dawn" })).toEqual([photos[0]]);
  });

  it("선택한 카메라로 정확히 일치하는 사진만 보여준다", () => {
    const photos = [photo(), photo({ id: "photo-2", camera: "Fujifilm X-T5" })];

    expect(filterPhotos(photos, { ...allFilters, camera: "Fujifilm X-T5" })).toEqual([photos[1]]);
  });

  it.each([
    ["한글 제목", "  새벽  "],
    ["영문 제목의 대소문자", "HARBOR"],
    ["한글 장소", "부산"],
    ["영문 장소", "busan"],
    ["카메라", "a7 iv"],
    ["렌즈", "35MM"],
  ])("%s로 사진을 검색한다", (_label, query) => {
    expect(filterPhotos([photo()], { ...allFilters, query })).toHaveLength(1);
  });

  it("검색어가 어느 검색 필드에도 없으면 사진을 제외한다", () => {
    expect(filterPhotos([photo()], { ...allFilters, query: "제주" })).toEqual([]);
  });

  it("초점거리 범위의 양쪽 경계값을 포함한다", () => {
    const photos = [
      photo({ id: "min", exif: { ...photo().exif, focalLength: "24 mm" } }),
      photo({ id: "max", exif: { ...photo().exif, focalLength: "70 mm" } }),
      photo({ id: "outside", exif: { ...photo().exif, focalLength: "85 mm" } }),
    ];

    expect(
      filterPhotos(photos, { ...allFilters, focalMin: 24, focalMax: 70 }).map(({ id }) => id),
    ).toEqual(["min", "max"]);
  });

  it("초점거리가 없거나 숫자로 시작하지 않으면 범위 검색에서 제외한다", () => {
    const photos = [
      photo({ id: "empty", exif: { ...photo().exif, focalLength: "" } }),
      photo({ id: "invalid", exif: { ...photo().exif, focalLength: "unknown" } }),
    ];

    expect(filterPhotos(photos, allFilters)).toEqual([]);
  });

  it("태그·카메라·초점거리·검색어 조건을 모두 만족해야 한다", () => {
    const matching = photo();
    const wrongTag = photo({ id: "wrong-tag", tags: ["night"] });
    const wrongCamera = photo({ id: "wrong-camera", camera: "Fujifilm X-T5" });

    expect(
      filterPhotos([matching, wrongTag, wrongCamera], {
        tag: "dawn",
        query: "부산",
        camera: "Sony A7 IV",
        focalMin: 35,
        focalMax: 35,
      }),
    ).toEqual([matching]);
  });
});
