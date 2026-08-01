import { describe, expect, it } from "vitest";

import { imagePaths, imagePreviewUrl, imageThumbnailUrl, type ImageMeta } from "@/types/image";

const main: ImageMeta = {
  url: "/main.webp",
  path: "photos/id/main.webp",
  w: 2048,
  h: 1365,
};

describe("imagePreviewUrl", () => {
  it("중간 프리뷰가 있으면 카드·그리드에 우선 사용한다", () => {
    expect(
      imagePreviewUrl({
        ...main,
        preview: {
          url: "/preview.webp",
          path: "photos/id/previews/preview.webp",
          w: 960,
          h: 640,
        },
        thumbnail: {
          url: "/thumbnail.webp",
          path: "photos/id/thumbnails/thumbnail.webp",
          w: 320,
          h: 213,
        },
      }),
    ).toBe("/preview.webp");
  });

  it("프리뷰가 없는 기존 문서는 썸네일 다음 메인 순으로 폴백한다", () => {
    expect(
      imagePreviewUrl({
        ...main,
        thumbnail: {
          url: "/thumbnail.webp",
          path: "photos/id/thumbnails/thumbnail.webp",
          w: 320,
          h: 213,
        },
      }),
    ).toBe("/thumbnail.webp");
    expect(imagePreviewUrl(main)).toBe("/main.webp");
  });
});

describe("imageThumbnailUrl", () => {
  it("작은 UI에서는 썸네일을 프리뷰보다 우선한다", () => {
    expect(
      imageThumbnailUrl({
        ...main,
        preview: {
          url: "/preview.webp",
          path: "photos/id/previews/preview.webp",
          w: 960,
          h: 640,
        },
        thumbnail: {
          url: "/thumbnail.webp",
          path: "photos/id/thumbnails/thumbnail.webp",
          w: 320,
          h: 213,
        },
      }),
    ).toBe("/thumbnail.webp");
  });
});

describe("imagePaths", () => {
  it("메인·프리뷰·썸네일 Storage 경로를 함께 반환한다", () => {
    expect(
      imagePaths({
        ...main,
        preview: {
          url: "/preview.webp",
          path: "photos/id/previews/preview.webp",
          w: 960,
          h: 640,
        },
        thumbnail: {
          url: "/thumbnail.webp",
          path: "photos/id/thumbnails/thumbnail.webp",
          w: 320,
          h: 213,
        },
      }),
    ).toEqual([
      "photos/id/main.webp",
      "photos/id/previews/preview.webp",
      "photos/id/thumbnails/thumbnail.webp",
    ]);
  });
});
