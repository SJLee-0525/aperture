import { describe, expect, it } from "vitest";

import { imagePaths, imagePreviewUrl, type ImageMeta } from "@/types/image";

const main: ImageMeta = {
  url: "/main.webp",
  path: "photos/id/main.webp",
  w: 2048,
  h: 1365,
};

describe("imagePreviewUrl", () => {
  it("썸네일이 있으면 목록 미리보기에 우선 사용한다", () => {
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
  });

  it("기존 문서는 메인 이미지로 폴백한다", () => {
    expect(imagePreviewUrl(main)).toBe("/main.webp");
  });
});

describe("imagePaths", () => {
  it("메인과 썸네일 Storage 경로를 함께 반환한다", () => {
    expect(
      imagePaths({
        ...main,
        thumbnail: {
          url: "/thumbnail.webp",
          path: "photos/id/thumbnails/thumbnail.webp",
          w: 320,
          h: 213,
        },
      }),
    ).toEqual(["photos/id/main.webp", "photos/id/thumbnails/thumbnail.webp"]);
  });
});
