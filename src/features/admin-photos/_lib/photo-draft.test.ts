import { describe, expect, it } from "vitest";

import {
  applyUploadResult,
  createPhotoInput,
  parseCoords,
  validatePhotoInput,
} from "@/features/admin-photos/_lib/photo-draft";
import type { UploadResult } from "@/features/image-upload/_hooks/use-image-upload";
import { MOCK_PHOTOS } from "@/mocks/photos";

const uploadResult = (): UploadResult => ({
  image: { url: "/uploaded.webp", path: "photos/id/uploaded.webp", w: 2048, h: 1365 },
  dimensions: { w: 6000, h: 4000 },
  aspectRatio: 1.5,
  exif: {
    camera: "Sony A7 IV",
    lens: "FE 35mm F1.4",
    aperture: "f/1.4",
    shutter: "1/250",
    iso: "100",
    focalLength: "35 mm",
    ev: "0 EV",
    wb: "Auto",
    metering: "Pattern",
    flash: "Off",
    shotAt: new Date("2026-04-05T06:30:00+09:00"),
    coords: { lat: 35.1796, lng: 129.0756 },
    fileName: "harbor.jpg",
  },
});

describe("applyUploadResult", () => {
  it("업로드된 이미지와 EXIF를 사진 초안에 반영한다", () => {
    const input = createPhotoInput();
    const result = uploadResult();

    expect(applyUploadResult(input, result)).toMatchObject({
      image: result.image,
      dimensions: result.dimensions,
      aspectRatio: result.aspectRatio,
      camera: result.exif.camera,
      lens: result.exif.lens,
      fileName: result.exif.fileName,
      shotAt: result.exif.shotAt,
      coords: result.exif.coords,
    });
  });

  it("EXIF에 촬영일과 좌표가 없으면 초안의 기존 값을 유지한다", () => {
    const input = {
      ...createPhotoInput(),
      shotAt: new Date("2025-01-02T03:04:00Z"),
      coords: { lat: 37.5665, lng: 126.978 },
    };
    const result = uploadResult();
    result.exif.shotAt = null;
    result.exif.coords = null;

    const applied = applyUploadResult(input, result);

    expect(applied.shotAt).toBe(input.shotAt);
    expect(applied.coords).toBe(input.coords);
  });

  it("초안의 제목·장소·태그·공개 상태는 변경하지 않는다", () => {
    const input = {
      ...createPhotoInput(),
      title: { ko: "제목", en: "Title" },
      place: { ko: "서울", en: "Seoul" },
      tags: ["city"],
      published: true,
    };

    expect(applyUploadResult(input, uploadResult())).toMatchObject({
      title: input.title,
      place: input.place,
      tags: input.tags,
      published: true,
    });
  });
});

describe("createPhotoInput", () => {
  it("신규 사진에 빈 비공개 초안을 만든다", () => {
    expect(createPhotoInput()).toMatchObject({
      title: { ko: "", en: "" },
      coords: null,
      tags: [],
      image: { url: "", path: "", w: 0, h: 0 },
      order: 0,
      published: false,
    });
  });

  it("기존 사진에서 문서 id와 좋아요 수만 제외한다", () => {
    const source = MOCK_PHOTOS[0];
    const input = createPhotoInput(source);

    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("likes");
    expect(input).toEqual(
      Object.fromEntries(Object.entries(source).filter(([key]) => key !== "id" && key !== "likes")),
    );
  });
});

describe("parseCoords", () => {
  it("위도와 경도 문자열을 숫자 좌표로 변환한다", () => {
    expect(parseCoords(" 37.5665 ", "126.9780")).toEqual({ lat: 37.5665, lng: 126.978 });
  });

  it.each([
    ["", "127"],
    ["37", "  "],
    ["north", "127"],
    ["37", "east"],
  ])("불완전하거나 숫자가 아닌 좌표(%j, %j)는 비어 있는 것으로 처리한다", (lat, lng) => {
    expect(parseCoords(lat, lng)).toBeNull();
  });

  it("0 좌표를 유효한 값으로 보존한다", () => {
    expect(parseCoords("0", "0")).toEqual({ lat: 0, lng: 0 });
  });
});

describe("validatePhotoInput", () => {
  it("한국어 제목을 먼저 요구한다", () => {
    expect(validatePhotoInput(createPhotoInput())).toBe("제목(한국어)을 입력하세요.");
  });

  it("제목이 있으면 업로드된 이미지를 요구한다", () => {
    const input = { ...createPhotoInput(), title: { ko: "사진", en: "" } };

    expect(validatePhotoInput(input)).toBe("이미지를 먼저 업로드하세요.");
  });

  it("한국어 제목과 이미지가 있으면 저장할 수 있다", () => {
    const input = {
      ...createPhotoInput(),
      title: { ko: "사진", en: "" },
      image: { url: "/photo.webp", path: "photos/photo.webp", w: 100, h: 100 },
    };

    expect(validatePhotoInput(input)).toBeNull();
  });
});
