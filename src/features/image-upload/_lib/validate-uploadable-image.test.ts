import { describe, expect, it } from "vitest";

import { validateUploadableImage } from "@/features/image-upload/_lib/validate-uploadable-image";

const fileOf = (size: number, type: string): File =>
  ({ size, name: "upload", type }) as unknown as File;

describe("validateUploadableImage", () => {
  it("래스터 이미지는 허용한다", () => {
    expect(validateUploadableImage(fileOf(1, "image/jpeg"))).toBeNull();
  });

  it("이미지가 아닌 파일은 거부한다", () => {
    expect(validateUploadableImage(fileOf(1, "application/pdf"))).toBe(
      "이미지 파일만 업로드할 수 있습니다.",
    );
  });

  it("SVG 이미지는 거부한다", () => {
    expect(validateUploadableImage(fileOf(1, "image/svg+xml"))).toBe(
      "SVG 이미지는 업로드할 수 없습니다. 다른 이미지 형식을 선택해 주세요.",
    );
  });

  it("MIME 정보가 없으면 디코더에 판별을 맡긴다", () => {
    expect(validateUploadableImage(fileOf(1, ""))).toBeNull();
  });

  it("40MB까지 허용한다", () => {
    expect(validateUploadableImage(fileOf(40 * 1024 * 1024, "image/png"))).toBeNull();
  });

  it("40MB를 넘으면 기존 크기 안내를 돌려준다", () => {
    expect(validateUploadableImage(fileOf(41 * 1024 * 1024, "image/png"))).toBe(
      "41MB 파일은 브라우저에서 압축할 수 없습니다. 40MB 이하로 줄여 주세요.",
    );
  });
});
