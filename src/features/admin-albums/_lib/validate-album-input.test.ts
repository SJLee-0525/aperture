import { describe, expect, it } from "vitest";

import { emptyAlbumInput } from "@/features/admin-albums/_lib/album-form-data";
import { validateAlbumInput } from "@/features/admin-albums/_lib/validate-album-input";

describe("validateAlbumInput", () => {
  it("한국어 제목을 먼저 요구한다", () => {
    expect(validateAlbumInput(emptyAlbumInput())).toBe("제목(한국어)을 입력하세요.");
  });

  it("제목이 있으면 사진을 최소 한 장 요구한다", () => {
    const input = { ...emptyAlbumInput(), title: { ko: "앨범", en: "" } };

    expect(validateAlbumInput(input)).toBe("앨범에 넣을 사진을 최소 한 장 이상 선택하세요.");
  });

  it("제목과 사진이 있으면 저장할 수 있다", () => {
    const input = {
      ...emptyAlbumInput(),
      title: { ko: "앨범", en: "" },
      coverPhotoId: "p1",
      photoIds: ["p1"],
    };

    expect(validateAlbumInput(input)).toBeNull();
  });
});
