// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 아키텍처 원칙 3 — EXIF 추출은 압축 前이다. 압축 결과에는 메타데이터가 없으므로
 * 순서가 뒤집히면 조리개·셔터·좌표가 오류 없이 전부 사라진다. 두 함수가 별개 모듈이라
 * 호출 순서를 여기서 고정한다.
 */
const calls: string[] = [];

const mocks = vi.hoisted(() => ({
  extractExif: vi.fn(),
  compressToWebp: vi.fn(),
  compressPreviewToWebp: vi.fn(),
  compressThumbnailToWebp: vi.fn(),
  readDimensions: vi.fn(),
  store: {
    uploadPhotoImage: vi.fn(),
    uploadPhotoPreview: vi.fn(),
    uploadPhotoThumbnail: vi.fn(),
    uploadMusicPoster: vi.fn(),
    uploadMusicPosterPreview: vi.fn(),
    uploadMusicPosterThumbnail: vi.fn(),
    uploadDevImage: vi.fn(),
    uploadDevPreview: vi.fn(),
    uploadDevThumbnail: vi.fn(),
  },
}));

vi.mock("@/lib/exif/extract", () => ({ extractExif: mocks.extractExif }));
vi.mock("@/features/image-upload/_lib/compress", () => ({
  compressToWebp: mocks.compressToWebp,
  compressPreviewToWebp: mocks.compressPreviewToWebp,
  compressThumbnailToWebp: mocks.compressThumbnailToWebp,
}));
vi.mock("@/features/image-upload/_lib/read-dimensions", () => ({
  readDimensions: mocks.readDimensions,
}));
vi.mock("@/lib/admin/image-store", () => ({ getAdminImageStore: () => mocks.store }));

import { useDevImageUpload } from "@/features/image-upload/_hooks/use-dev-image-upload";
import { useImageUpload } from "@/features/image-upload/_hooks/use-image-upload";
import { usePosterUpload } from "@/features/image-upload/_hooks/use-poster-upload";

const file = (name = "photo.jpg") => new File(["x"], name, { type: "image/jpeg" });
const stored = { url: "https://cdn.test/x.webp", path: "photos/p1/main.webp" };

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();

  mocks.extractExif.mockImplementation(async () => {
    calls.push("exif");
    return { camera: "" };
  });
  mocks.readDimensions.mockImplementation(async () => {
    calls.push("dimensions");
    return { w: 4000, h: 3000 };
  });
  mocks.compressToWebp.mockImplementation(async () => {
    calls.push("compress:main");
    return new Blob(["m"], { type: "image/webp" });
  });
  mocks.compressPreviewToWebp.mockImplementation(async () => {
    calls.push("compress:preview");
    return new Blob(["p"], { type: "image/webp" });
  });
  mocks.compressThumbnailToWebp.mockImplementation(async () => {
    calls.push("compress:thumbnail");
    return new Blob(["t"], { type: "image/webp" });
  });
  for (const upload of Object.values(mocks.store)) upload.mockResolvedValue(stored);
});

afterEach(cleanup);

describe("사진 업로드", () => {
  it("EXIF 추출이 압축보다 먼저다", async () => {
    const { result } = renderHook(() => useImageUpload("p1"));

    await result.current.process(file());

    expect(calls.indexOf("exif")).toBeLessThan(calls.indexOf("compress:main"));
  });

  it("파생본은 원본이 아니라 메인 webp 를 줄여 만든다", async () => {
    // 원본을 셋이 각자 디코딩하면 4천만 화소 사진에서 메모리가 세 배로 늘어
    // 모바일 Safari 가 탭을 종료한다.
    const source = file();
    const { result } = renderHook(() => useImageUpload("p1"));

    await result.current.process(source);

    const main = await mocks.compressToWebp.mock.results[0]?.value;
    expect(mocks.compressToWebp).toHaveBeenCalledWith(source);
    expect(mocks.compressPreviewToWebp).toHaveBeenCalledWith(main);
    expect(mocks.compressThumbnailToWebp).toHaveBeenCalledWith(main);
  });

  it("원본 해상도로 종횡비를 계산해 EXIF 와 함께 돌려준다", async () => {
    const { result } = renderHook(() => useImageUpload("p1"));

    const uploaded = await result.current.process(file());

    expect(uploaded?.dimensions).toEqual({ w: 4000, h: 3000 });
    expect(uploaded?.aspectRatio).toBeCloseTo(4000 / 3000);
    expect(uploaded?.exif).toEqual({ camera: "" });
  });

  it("크기 상한을 넘으면 EXIF 도 압축도 시작하지 않는다", async () => {
    const huge = new File([new Uint8Array(64 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const { result } = renderHook(() => useImageUpload("p1"));

    const uploaded = await result.current.process(huge);

    expect(uploaded).toBeNull();
    expect(calls).toEqual([]);
  });

  it("파이프라인 실패는 오류로 남기고 null 을 돌려준다", async () => {
    mocks.compressToWebp.mockRejectedValue(new Error("압축 실패"));
    const { result } = renderHook(() => useImageUpload("p1"));

    await expect(result.current.process(file())).resolves.toBeNull();
  });
});

describe("EXIF 를 쓰지 않는 업로드", () => {
  // 포스터와 개발 이미지에는 촬영 정보가 없다. 추출을 넣으면 exifr 을 그 화면에서도
  // 내려받게 되고, 없는 값을 폼이 채우려 든다.
  it("포스터는 EXIF 를 추출하지 않는다", async () => {
    const { result } = renderHook(() => usePosterUpload("w1"));

    await result.current.process(file("poster.jpg"));

    expect(mocks.extractExif).not.toHaveBeenCalled();
    expect(mocks.store.uploadMusicPoster).toHaveBeenCalledTimes(1);
    expect(mocks.store.uploadMusicPosterPreview).toHaveBeenCalledTimes(1);
    expect(mocks.store.uploadMusicPosterThumbnail).toHaveBeenCalledTimes(1);
  });

  it("개발 이미지도 EXIF 를 추출하지 않는다", async () => {
    const { result } = renderHook(() => useDevImageUpload("d1"));

    await result.current.process(file("shot.png"));

    expect(mocks.extractExif).not.toHaveBeenCalled();
    expect(mocks.store.uploadDevImage).toHaveBeenCalledTimes(1);
  });
});
