import { describe, expect, it } from "vitest";

import { photoToInput } from "@/features/admin-photos/_lib/photo-form-data";
import { validatePhotoInput } from "@/features/admin-photos/_lib/validate-photo-input";

describe("validatePhotoInput", () => {
  it("한국어 제목을 먼저 요구한다", () => {
    expect(validatePhotoInput(photoToInput())).toContainEqual(expect.objectContaining({ message: "제목(한국어)을 입력하세요." }));
  });

  it("제목이 있으면 업로드된 이미지를 요구한다", () => {
    const input = { ...photoToInput(), title: { ko: "사진", en: "" } };

    expect(validatePhotoInput(input)).toContainEqual(expect.objectContaining({ message: "이미지를 먼저 업로드하세요." }));
  });

  it("한국어 제목과 이미지가 있으면 저장할 수 있다", () => {
    const input = {
      ...photoToInput(),
      title: { ko: "사진", en: "" },
      image: { url: "/photo.webp", path: "photos/photo.webp", w: 100, h: 100 },
    };

    expect(validatePhotoInput(input)).toEqual([]);
  });
});
