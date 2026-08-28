import { describe, expect, it } from "vitest";

import { removePhotoFromAlbum } from "@/lib/content/remove-photo-from-album";

import type { ImageMeta } from "@/types/image";

const COVER: ImageMeta = { url: "https://example.test/a.webp", path: "photos/a.webp", w: 4, h: 3 };

describe("removePhotoFromAlbum", () => {
  it("일반 사진 참조만 제거하고 커버는 유지한다", () => {
    expect(
      removePhotoFromAlbum({ cover: COVER, coverPhotoId: "a", photoIds: ["a", "b", "c"] }, "b"),
    ).toEqual({
      cover: COVER,
      coverPhotoId: "a",
      photoIds: ["a", "c"],
    });
  });

  it("커버 사진을 삭제하면 남은 첫 사진을 커버로 지정한다", () => {
    expect(
      removePhotoFromAlbum({ cover: COVER, coverPhotoId: "a", photoIds: ["a", "b", "c"] }, "a"),
    ).toEqual({
      cover: null,
      coverPhotoId: "b",
      photoIds: ["b", "c"],
    });
  });

  it("마지막 사진을 삭제하면 커버도 비운다", () => {
    expect(removePhotoFromAlbum({ cover: COVER, coverPhotoId: "a", photoIds: ["a"] }, "a")).toEqual(
      {
        cover: null,
        coverPhotoId: "",
        photoIds: [],
      },
    );
  });

  // 커버 사진이 지워지면 Storage 객체도 함께 사라진다. 스냅샷을 그대로 두면
  // 관리자 목록과 챗 참조 카드가 죽은 이미지 URL 을 계속 보여 준다.
  it("커버 사진을 삭제하면 이미지 스냅샷을 비운다", () => {
    const result = removePhotoFromAlbum(
      { cover: COVER, coverPhotoId: "a", photoIds: ["a", "b"] },
      "a",
    );

    expect(result.cover).toBeNull();
  });
});
