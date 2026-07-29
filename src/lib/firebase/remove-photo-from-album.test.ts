import { describe, expect, it } from "vitest";

import { removePhotoFromAlbum } from "@/lib/firebase/remove-photo-from-album";

describe("removePhotoFromAlbum", () => {
  it("일반 사진 참조만 제거하고 커버는 유지한다", () => {
    expect(removePhotoFromAlbum({ coverPhotoId: "a", photoIds: ["a", "b", "c"] }, "b")).toEqual({
      coverPhotoId: "a",
      photoIds: ["a", "c"],
    });
  });

  it("커버 사진을 삭제하면 남은 첫 사진을 커버로 지정한다", () => {
    expect(removePhotoFromAlbum({ coverPhotoId: "a", photoIds: ["a", "b", "c"] }, "a")).toEqual({
      coverPhotoId: "b",
      photoIds: ["b", "c"],
    });
  });

  it("마지막 사진을 삭제하면 커버도 비운다", () => {
    expect(removePhotoFromAlbum({ coverPhotoId: "a", photoIds: ["a"] }, "a")).toEqual({
      coverPhotoId: "",
      photoIds: [],
    });
  });
});
