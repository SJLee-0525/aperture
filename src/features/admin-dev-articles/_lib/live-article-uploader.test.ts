import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compressToWebp: vi.fn(),
  compressPreviewToWebp: vi.fn(),
  compressThumbnailToWebp: vi.fn(),
  readDimensions: vi.fn(),
  uploadArticleImage: vi.fn(),
  uploadArticlePreview: vi.fn(),
  uploadArticleThumbnail: vi.fn(),
}));

vi.mock("@/features/image-upload/_lib/compress", () => ({
  compressToWebp: mocks.compressToWebp,
  compressPreviewToWebp: mocks.compressPreviewToWebp,
  compressThumbnailToWebp: mocks.compressThumbnailToWebp,
}));
vi.mock("@/features/image-upload/_lib/read-dimensions", () => ({
  readDimensions: mocks.readDimensions,
}));
vi.mock("@/lib/supabase/storage", () => ({
  uploadArticleImage: mocks.uploadArticleImage,
  uploadArticlePreview: mocks.uploadArticlePreview,
  uploadArticleThumbnail: mocks.uploadArticleThumbnail,
}));

import {
  createLiveArticleBodyUploader,
  createLiveArticleCoverUploader,
} from "@/features/admin-dev-articles/_lib/live-article-uploader";

const file = new File([], "a.png", { type: "image/png" });

/** 업로드 헬퍼가 받은 assetId 인자. 세 변형이 같은 값을 써야 한다. */
const assetIdArgOf = (mock: ReturnType<typeof vi.fn>): string => mock.mock.calls[0][1];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.compressToWebp.mockResolvedValue(new Blob());
  mocks.compressPreviewToWebp.mockResolvedValue(new Blob());
  mocks.compressThumbnailToWebp.mockResolvedValue(new Blob());
  mocks.readDimensions.mockResolvedValue({ w: 1024, h: 768 });
  mocks.uploadArticleImage.mockResolvedValue({ url: "u/main", path: "p/main" });
  mocks.uploadArticlePreview.mockResolvedValue({ url: "u/preview", path: "p/preview" });
  mocks.uploadArticleThumbnail.mockResolvedValue({ url: "u/thumbnail", path: "p/thumbnail" });
});

describe("createLiveArticleCoverUploader", () => {
  it("세 변형을 같은 asset ID 로 올린다", async () => {
    const image = await createLiveArticleCoverUploader("a1")(file);

    expect(mocks.uploadArticleImage).toHaveBeenCalledTimes(1);
    expect(mocks.uploadArticlePreview).toHaveBeenCalledTimes(1);
    expect(mocks.uploadArticleThumbnail).toHaveBeenCalledTimes(1);

    const assetId = assetIdArgOf(mocks.uploadArticleImage);
    expect(assetId).toMatch(/^[0-9a-f-]{36}$/);
    expect(assetIdArgOf(mocks.uploadArticlePreview)).toBe(assetId);
    expect(assetIdArgOf(mocks.uploadArticleThumbnail)).toBe(assetId);

    expect(image).toMatchObject({
      path: "p/main",
      w: 1024,
      h: 768,
      preview: { path: "p/preview" },
      thumbnail: { path: "p/thumbnail" },
    });
  });

  it("이미지마다 다른 asset ID 를 쓴다", async () => {
    const upload = createLiveArticleCoverUploader("a1");
    await upload(file);
    await upload(file);

    expect(mocks.uploadArticleImage.mock.calls[0][1]).not.toBe(
      mocks.uploadArticleImage.mock.calls[1][1],
    );
  });
});

describe("createLiveArticleBodyUploader", () => {
  it("원본 한 장만 올리고 파생본을 만들지 않는다", async () => {
    const image = await createLiveArticleBodyUploader("a1")(file);

    expect(mocks.uploadArticleImage).toHaveBeenCalledTimes(1);
    expect(mocks.uploadArticlePreview).not.toHaveBeenCalled();
    expect(mocks.uploadArticleThumbnail).not.toHaveBeenCalled();
    expect(mocks.compressPreviewToWebp).not.toHaveBeenCalled();
    expect(mocks.compressThumbnailToWebp).not.toHaveBeenCalled();

    expect(image.preview).toBeUndefined();
    expect(image.thumbnail).toBeUndefined();
    // 본문 Markdown 이 자리 예약에 쓰는 값이라 원본 크기는 채워야 한다.
    expect(image).toMatchObject({ url: "u/main", path: "p/main", w: 1024, h: 768 });
  });
});
