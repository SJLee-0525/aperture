import { describe, expect, it } from "vitest";

import { toAlbumCards } from "@/features/albums/_lib/album-cards";

import type { Album } from "@/types/album";
import type { Photo } from "@/types/photo";

const album = (overrides: Partial<Album> = {}): Album => ({
  id: "album-1",
  title: { ko: "앨범", en: "Album" },
  subtitle: { ko: "부제", en: "Subtitle" },
  coverPhotoId: "photo-1",
  photoIds: ["photo-1", "photo-2"],
  order: 0,
  published: true,
  ...overrides,
});

const photo = (id: string, withPreview = false): Photo =>
  ({
    id,
    image: {
      url: `/${id}.webp`,
      path: `${id}.webp`,
      w: 100,
      h: 100,
      ...(withPreview
        ? {
            preview: {
              url: `/${id}-preview.webp`,
              path: `${id}-preview.webp`,
              w: 960,
              h: 640,
            },
          }
        : {}),
    },
  }) as Photo;

describe("toAlbumCards", () => {
  it("커버 URL·공개 장수·표시 필드만 담은 카드로 투영한다", () => {
    expect(toAlbumCards([album()], [photo("photo-1", true), photo("photo-2")])).toEqual([
      {
        id: "album-1",
        title: { ko: "앨범", en: "Album" },
        subtitle: { ko: "부제", en: "Subtitle" },
        coverUrl: "/photo-1-preview.webp",
        count: 2,
      },
    ]);
  });

  it("지정 커버가 공개 목록에 없으면 첫 공개 사진으로 폴백한다", () => {
    const [card] = toAlbumCards([album()], [photo("photo-2")]);
    expect(card.coverUrl).toBe("/photo-2.webp");
    expect(card.count).toBe(1);
  });

  it("앨범 사진이 전부 비공개면 커버 없음·0장으로 투영한다", () => {
    const [card] = toAlbumCards([album()], [photo("other-photo")]);
    expect(card.coverUrl).toBeNull();
    expect(card.count).toBe(0);
  });
});
