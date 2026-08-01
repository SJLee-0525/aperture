// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExifPanel } from "@/features/photo-detail/_components/ExifPanel";
import type { Photo } from "@/types/photo";

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      sharePhotoLabel: "사진 공유하기",
      focalLabel: "초점 거리",
      exifEv: "노출 보정",
      exifWb: "화이트 밸런스",
      exifMetering: "측광",
      exifFlash: "플래시",
      exifSize: "크기",
      exifShotAt: "촬영일",
      exifFile: "파일",
      exifAperture: "조리개",
      exifShutter: "셔터",
      exifIso: "ISO",
    },
  }),
}));
vi.mock("@/features/photo-detail/_components/DetailMiniMap", () => ({
  DetailMiniMap: () => null,
}));

const photo = {
  id: "p02",
  title: { ko: "테스트 사진", en: "Test photo" },
  shotAt: new Date("2026-01-01T00:00:00Z"),
  camera: "Camera",
  lens: "Lens",
  exif: {
    aperture: "f/2.8",
    shutter: "1/500",
    iso: "100",
    focalLength: "35 mm",
    ev: "0 EV",
    wb: "Auto",
    metering: "Multi",
    flash: "Off",
  },
  dimensions: { w: 6000, h: 4000 },
  aspectRatio: 1.5,
  place: { ko: "서울", en: "Seoul" },
  coords: null,
  tags: [],
  image: { url: "/photo.webp", path: "photos/photo.webp", w: 6000, h: 4000 },
  order: 0,
  published: true,
} as Photo;

describe("ExifPanel 공유", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("현재 사진 제목과 딥링크를 Web Share API에 전달한다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, share });
    window.history.replaceState({}, "", "/photo?photo=p02");

    render(<ExifPanel photo={photo} tagLabels={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "사진 공유하기" }));

    expect(share).toHaveBeenCalledWith({
      title: "테스트 사진",
      url: "http://localhost:3000/photo?photo=p02",
    });
  });

  it("Web Share API가 없으면 현재 딥링크를 클립보드에 복사한다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...window.navigator, clipboard: { writeText } });
    window.history.replaceState({}, "", "/photo?photo=p02");

    render(<ExifPanel photo={photo} tagLabels={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "사진 공유하기" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("http://localhost:3000/photo?photo=p02"),
    );
  });
});
