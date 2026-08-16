import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  shouldUseMockContent: vi.fn(),
  createLiveArticleCoverUploader: vi.fn(() => vi.fn()),
  createLiveArticleBodyUploader: vi.fn(() => vi.fn()),
  createMockArticleImageUploader: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/content/content-source", () => ({
  shouldUseMockContent: mocks.shouldUseMockContent,
}));
vi.mock("@/features/admin-dev-articles/_lib/live-article-uploader", () => ({
  createLiveArticleCoverUploader: mocks.createLiveArticleCoverUploader,
  createLiveArticleBodyUploader: mocks.createLiveArticleBodyUploader,
}));
vi.mock("@/features/admin-dev-articles/_lib/mock-article-uploader", () => ({
  createMockArticleImageUploader: mocks.createMockArticleImageUploader,
}));

import {
  createArticleBodyUploader,
  createArticleCoverUploader,
} from "@/features/admin-dev-articles/_lib/article-image-uploader";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createArticleCoverUploader", () => {
  it("live 에서 대표 이미지 업로더를 고르고 용도를 표시한다", () => {
    mocks.shouldUseMockContent.mockReturnValue(false);

    const upload = createArticleCoverUploader("a1");

    expect(mocks.createLiveArticleCoverUploader).toHaveBeenCalledWith("a1");
    expect(mocks.createLiveArticleBodyUploader).not.toHaveBeenCalled();
    expect(upload.variant).toBe("cover");
  });

  it("mock 에서도 용도 표시가 남는다", () => {
    mocks.shouldUseMockContent.mockReturnValue(true);

    expect(createArticleCoverUploader("a1").variant).toBe("cover");
    expect(mocks.createMockArticleImageUploader).toHaveBeenCalledWith("a1");
  });
});

describe("createArticleBodyUploader", () => {
  it("live 에서 본문 이미지 업로더를 고르고 용도를 표시한다", () => {
    mocks.shouldUseMockContent.mockReturnValue(false);

    const upload = createArticleBodyUploader("a1");

    expect(mocks.createLiveArticleBodyUploader).toHaveBeenCalledWith("a1");
    expect(mocks.createLiveArticleCoverUploader).not.toHaveBeenCalled();
    expect(upload.variant).toBe("body");
  });

  it("대표 이미지와 다른 인스턴스를 만든다", () => {
    mocks.shouldUseMockContent.mockReturnValue(true);

    expect(createArticleCoverUploader("a1")).not.toBe(createArticleBodyUploader("a1"));
  });
});
