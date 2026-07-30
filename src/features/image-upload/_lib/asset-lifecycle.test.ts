import { beforeEach, describe, expect, it, vi } from "vitest";

import { imagePaths, removeUnreferencedImages } from "@/features/image-upload/_lib/asset-lifecycle";

const { deleteImagesMock } = vi.hoisted(() => ({
  deleteImagesMock: vi.fn<(paths: Iterable<string>) => Promise<void>>(),
}));

vi.mock("@/lib/firebase/storage", () => ({
  deleteImages: deleteImagesMock,
}));

describe("imagePaths", () => {
  it("이미지 메타데이터에서 삭제 가능한 Storage 경로만 추출한다", () => {
    expect(
      imagePaths([
        { url: "/one.webp", path: "dev/id/one.webp", w: 100, h: 100 },
        null,
        undefined,
        { url: "/missing.webp", path: "", w: 100, h: 100 },
        { url: "/two.webp", path: "dev/id/two.webp", w: 200, h: 100 },
        {
          url: "/three.webp",
          path: "dev/id/three.webp",
          w: 200,
          h: 100,
          thumbnail: {
            url: "/three-thumb.webp",
            path: "dev/id/thumbnails/three.webp",
            w: 100,
            h: 50,
          },
        },
      ]),
    ).toEqual([
      "dev/id/one.webp",
      "dev/id/two.webp",
      "dev/id/three.webp",
      "dev/id/thumbnails/three.webp",
    ]);
  });
});

describe("removeUnreferencedImages", () => {
  beforeEach(() => {
    deleteImagesMock.mockReset();
    deleteImagesMock.mockResolvedValue();
  });

  it("후보 중 최종 문서가 참조하지 않는 이미지만 삭제한다", async () => {
    await removeUnreferencedImages(
      ["dev/id/old.webp", "dev/id/keep.webp", "dev/id/session.webp"],
      ["dev/id/keep.webp", "dev/id/session.webp"],
    );

    expect(deleteImagesMock).toHaveBeenCalledWith(["dev/id/old.webp"]);
  });

  it("유지 대상이 없어도 모든 후보를 삭제 대상으로 전달한다", async () => {
    await removeUnreferencedImages(new Set(["one.webp", "two.webp"]), []);

    expect(deleteImagesMock).toHaveBeenCalledWith(["one.webp", "two.webp"]);
  });

  it("삭제 실패를 호출자에게 전달한다", async () => {
    const failure = new Error("storage unavailable");
    deleteImagesMock.mockRejectedValue(failure);

    await expect(removeUnreferencedImages(["old.webp"], [])).rejects.toBe(failure);
  });
});
