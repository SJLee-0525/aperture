import { describe, expect, it } from "vitest";

import {
  albumToInput,
  emptyAlbumInput,
  normalizeAlbumInput,
  validateAlbumInput,
} from "@/features/admin-albums/_lib/album-form-data";

import { MOCK_ALBUMS } from "@/mocks/albums";

describe("normalizeAlbumInput", () => {
  it("선택된 사진인 기존 커버를 유지한다", () => {
    const input = { ...emptyAlbumInput(), coverPhotoId: "p2", photoIds: ["p1", "p2"] };

    expect(normalizeAlbumInput(input).coverPhotoId).toBe("p2");
  });

  it("기존 커버가 빠졌으면 첫 번째 선택 사진을 커버로 삼는다", () => {
    const input = { ...emptyAlbumInput(), coverPhotoId: "removed", photoIds: ["p3", "p1"] };

    expect(normalizeAlbumInput(input).coverPhotoId).toBe("p3");
  });

  it("사진이 없으면 커버도 비운다", () => {
    const input = { ...emptyAlbumInput(), coverPhotoId: "removed" };

    expect(normalizeAlbumInput(input).coverPhotoId).toBe("");
  });

  it("원본 입력을 변경하지 않는다", () => {
    const input = { ...emptyAlbumInput(), coverPhotoId: "removed", photoIds: ["p1"] };

    const normalized = normalizeAlbumInput(input);

    expect(input.coverPhotoId).toBe("removed");
    expect(normalized).not.toBe(input);
  });
});

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

describe("albumToInput", () => {
  it("기존 앨범에서 문서 id만 제외한다", () => {
    const album = MOCK_ALBUMS[0];

    expect(albumToInput(album)).toEqual(
      Object.fromEntries(Object.entries(album).filter(([key]) => key !== "id")),
    );
  });
});
