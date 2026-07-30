// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AboutView } from "@/features/about/_components/AboutView";

vi.mock("@/components/AboutSection", () => ({
  AboutSection: ({ cols }: { cols: Array<{ label: string; items: string[] }> }) => (
    <>
      {cols.map((col) => (
        <div key={col.label} data-testid={col.label}>
          {col.items.map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      ))}
    </>
  ),
}));

vi.mock("@/features/lang/_hooks/use-lang", () => ({
  useLang: () => ({
    lang: "ko",
    dict: {
      cameraLabel: "카메라",
      lensLabel: "렌즈",
      statPhotos: "사진",
      statAlbums: "앨범",
      statLocations: "장소",
      statCameras: "카메라",
    },
  }),
}));

describe("AboutView", () => {
  afterEach(cleanup);

  it("빈 값과 공백뿐인 렌즈를 목록에서 제거한다", () => {
    const place = { ko: "서울", en: "Seoul" };

    render(
      <AboutView
        bio={{ ko: "소개", en: "About" }}
        albumCount={0}
        photoFacts={[
          { camera: "Camera", lens: "RF24-70mm F2.8 L IS USM", place },
          { camera: "Camera", lens: "", place },
          { camera: "Camera", lens: "   ", place },
          { camera: "Camera", lens: " VOIGTLANDER NOKTON 35mm F1.2 ", place },
        ]}
      />,
    );

    const lensList = within(screen.getByTestId("렌즈"));
    expect(lensList.getAllByText(/.+/).map((item) => item.textContent)).toEqual([
      "RF24-70mm F2.8 L IS USM",
      "VOIGTLANDER NOKTON 35mm F1.2",
    ]);
  });
});
