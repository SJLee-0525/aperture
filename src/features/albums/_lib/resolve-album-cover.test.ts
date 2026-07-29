import { describe, expect, it } from "vitest";

import { resolveAlbumCover } from "@/features/albums/_lib/resolve-album-cover";
import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

const album = (overrides: Partial<Album> = {}): Album => ({
  id: "album-1",
  title: { ko: "앨범", en: "Album" },
  subtitle: { ko: "", en: "" },
  coverPhotoId: "photo-1",
  photoIds: ["photo-1", "photo-2"],
  order: 0,
  published: true,
  ...overrides,
});

const photo = (id: string): Photo =>
  ({
    id,
    image: { url: `/${id}.webp`, path: `${id}.webp`, w: 100, h: 100 },
  }) as Photo;

describe("resolveAlbumCover", () => {
  it("앨범에 속한 지정 커버를 반환한다", () => {
    expect(resolveAlbumCover(album(), [photo("photo-1"), photo("photo-2")])).toBe("/photo-1.webp");
  });

  it("지정 커버가 없으면 앨범에 속한 첫 공개 사진을 사용한다", () => {
    expect(resolveAlbumCover(album(), [photo("photo-2")])).toBe("/photo-2.webp");
  });

  it("앨범 사진이 없을 때 무관한 전체 목록 사진을 사용하지 않는다", () => {
    expect(resolveAlbumCover(album(), [photo("other-photo")])).toBeNull();
  });
});
