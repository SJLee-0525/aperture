import { describe, expect, it } from "vitest";

import { devArticleRagPolicy } from "@/lib/firebase/dev-article-rag-policy";
import type { DevArticle } from "@/types/dev-article";

/**
 * 정책 테스트용 글을 만든다. 기본값은 발행 상태다.
 *
 * @param {Partial<DevArticle>} overrides 바꿀 필드.
 * @returns {DevArticle} 테스트 글.
 */
const article = (overrides: Partial<DevArticle> = {}): DevArticle => ({
  id: "a1",
  slug: "slug",
  title: { ko: "제목", en: "Title" },
  summary: { ko: "요약", en: "Summary" },
  body: "# 본문",
  cover: null,
  coverAlt: null,
  tags: ["firebase"],
  relatedProjectIds: [],
  published: true,
  publishedAt: new Date("2026-01-05T09:00:00Z"),
  firstPublishedAt: new Date("2026-01-05T09:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-06T00:00:00Z"),
  ...overrides,
});

// §11 표의 다섯 행을 그대로 케이스로 옮긴다.
describe("devArticleRagPolicy", () => {
  it("초안 생성·수정은 skip 한다", () => {
    expect(devArticleRagPolicy(null, article({ published: false }))).toBe("skip");
    expect(
      devArticleRagPolicy(article({ published: false }), article({ published: false, body: "새" })),
    ).toBe("skip");
    expect(devArticleRagPolicy(article({ published: false }), null)).toBe("skip");
  });

  it("최초 발행은 sync 한다", () => {
    expect(devArticleRagPolicy(null, article())).toBe("sync");
    expect(devArticleRagPolicy(article({ published: false }), article())).toBe("sync");
  });

  it("발행 글의 제목·요약·본문·태그 변경은 sync 한다", () => {
    expect(devArticleRagPolicy(article(), article({ body: "# 고친 본문" }))).toBe("sync");
    expect(devArticleRagPolicy(article(), article({ tags: ["nextjs"] }))).toBe("sync");
    expect(devArticleRagPolicy(article(), article({ title: { ko: "새 제목", en: "New" } }))).toBe(
      "sync",
    );
  });

  it("발행일·대표 이미지·연관 프로젝트만 바뀐 저장은 skip 한다", () => {
    expect(
      devArticleRagPolicy(
        article(),
        article({
          publishedAt: new Date("2026-02-01T00:00:00Z"),
          coverAlt: { ko: "설명", en: "Alt" },
          relatedProjectIds: ["p1"],
        }),
      ),
    ).toBe("skip");
  });

  it("발행 취소와 발행 글 삭제는 remove 한다", () => {
    expect(devArticleRagPolicy(article(), article({ published: false }))).toBe("remove");
    expect(devArticleRagPolicy(article(), null)).toBe("remove");
  });
});
