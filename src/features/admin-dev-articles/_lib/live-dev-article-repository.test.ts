import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  newId: vi.fn(() => "generated"),
  findArticleSlugOwner: vi.fn(),
  deleteArticleImages: vi.fn(),
  requestPublicPathRevalidate: vi.fn(),
  listDevArticleItemsAdmin: vi.fn(async () => []),
  listDevProjectItemsAdmin: vi.fn(async () => []),
  listDevArticleTagsAdmin: vi.fn(async () => []),
}));

vi.mock("@/lib/supabase/dev-articles", () => ({
  devArticlesCrud: {
    get: mocks.get,
    create: mocks.create,
    update: mocks.update,
    remove: mocks.remove,
    newId: mocks.newId,
  },
  findArticleSlugOwner: mocks.findArticleSlugOwner,
  listDevArticleTagsAdmin: mocks.listDevArticleTagsAdmin,
  createDevArticleTag: vi.fn(),
  updateDevArticleTag: vi.fn(),
  removeDevArticleTag: vi.fn(),
}));
vi.mock("@/lib/firebase/storage", () => ({ deleteArticleImages: mocks.deleteArticleImages }));
vi.mock("@/lib/cache/request-revalidate", () => ({
  requestPublicPathRevalidate: mocks.requestPublicPathRevalidate,
  requestPublicRevalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/admin-list", () => ({
  listDevArticleItemsAdmin: mocks.listDevArticleItemsAdmin,
  listDevProjectItemsAdmin: mocks.listDevProjectItemsAdmin,
}));
// 발행 조건과 최초 발행 스탬프는 도메인 모듈의 별도 테스트가 고정한다.
// 여기서는 경로 재검증과 삭제 흐름만 본다.
vi.mock("@/features/admin-dev-articles/_lib/dev-article-domain", () => ({
  assertArticlePublishable: vi.fn(),
  stampFirstPublished: (input: unknown) => input,
}));

import { createLiveDevArticleRepository } from "@/features/admin-dev-articles/_lib/live-dev-article-repository";

import type { DevArticle } from "@/types/dev-article";

const article = (over: Partial<DevArticle> = {}): DevArticle =>
  ({
    id: "a1",
    slug: "hello",
    title: { ko: "제목", en: "Title" },
    summary: { ko: "요약", en: "Summary" },
    body: "본문",
    cover: null,
    coverAlt: "",
    tags: [],
    relatedProjectIds: [],
    published: false,
    publishedAt: null,
    firstPublishedAt: null,
    ...over,
  }) as DevArticle;

const input = (over = {}) => {
  const full = article(over);
  delete (full as Partial<DevArticle>).id;
  return full;
};

const KO = "/ko/dev/articles/hello";
const EN = "/en/dev/articles/hello";

describe("createLiveDevArticleRepository", () => {
  const repository = createLiveDevArticleRepository(() => new Date("2026-01-01T00:00:00Z"));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findArticleSlugOwner.mockResolvedValue(null);
    mocks.deleteArticleImages.mockResolvedValue(undefined);
  });

  describe("remove", () => {
    it("삭제 전 조회가 실패해도 문서를 지운다", async () => {
      mocks.get.mockRejectedValue(new Error("글을 불러오지 못했습니다."));

      await expect(repository.remove("a1")).resolves.toEqual({ imageCleanupWarning: null });
      expect(mocks.remove).toHaveBeenCalledWith("a1");
    });

    it("삭제 전 조회가 실패하면 slug 를 몰라 경로 재검증을 하지 않는다", async () => {
      mocks.get.mockRejectedValue(new Error("글을 불러오지 못했습니다."));

      await repository.remove("a1");

      expect(mocks.requestPublicPathRevalidate).not.toHaveBeenCalled();
    });

    it("공개 글을 지우면 ko·en 상세 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: true }));

      await repository.remove("a1");

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });

    it("초안을 지우면 경로 재검증을 하지 않는다", async () => {
      mocks.get.mockResolvedValue(article({ published: false }));

      await repository.remove("a1");

      expect(mocks.requestPublicPathRevalidate).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("초안 생성에는 경로 재검증이 없다", async () => {
      await repository.create("a1", input({ published: false }));

      expect(mocks.create).toHaveBeenCalled();
      expect(mocks.requestPublicPathRevalidate).not.toHaveBeenCalled();
    });

    it("공개 상태로 생성하면 경로를 재검증한다", async () => {
      await repository.create("a1", input({ published: true }));

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });
  });

  describe("update", () => {
    it("초안을 초안으로 수정하면 경로 재검증이 없다", async () => {
      mocks.get.mockResolvedValue(article({ published: false }));

      await repository.update("a1", input({ published: false, body: "고침" }));

      expect(mocks.requestPublicPathRevalidate).not.toHaveBeenCalled();
    });

    // 초안일 때 열려 404 로 캐시된 상세는 태그 무효화가 지우지 못한다. 발행 상태가 그대로인
    // 저장도 경로를 재검증해야 그 404 가 풀린다.
    it("공개 글의 본문만 고쳐도 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: true }));

      await repository.update("a1", input({ published: true, body: "고침" }));

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });

    it("초안을 발행하면 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: false }));

      await repository.update("a1", input({ published: true }));

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });

    it("발행을 취소하면 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: true }));

      await repository.update("a1", input({ published: false }));

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });
  });

  describe("setPublished", () => {
    it("초안을 발행하면 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: false }));

      await repository.setPublished("a1", true);

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });

    // 캐시된 404 를 푸는 수단이 이 토글이라, 같은 값으로 눌러도 경로를 다시 지운다.
    it("이미 공개된 글에 같은 값을 넣어도 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: true }));

      await repository.setPublished("a1", true);

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });

    it("공개를 내려도 경로를 재검증한다", async () => {
      mocks.get.mockResolvedValue(article({ published: true }));

      await repository.setPublished("a1", false);

      expect(mocks.requestPublicPathRevalidate).toHaveBeenCalledWith(KO, EN);
    });

    it("초안에 같은 값을 넣으면 경로 재검증이 없다", async () => {
      mocks.get.mockResolvedValue(article({ published: false }));

      await repository.setPublished("a1", false);

      expect(mocks.requestPublicPathRevalidate).not.toHaveBeenCalled();
    });
  });
});
