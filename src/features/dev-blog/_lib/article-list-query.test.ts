import { describe, expect, it } from "vitest";

import {
  ARTICLES_PER_PAGE,
  articlePageCount,
  buildArticleListHref,
  parseArticleListQuery,
  sliceArticlesPage,
} from "@/features/dev-blog/_lib/article-list-query";

import type { DevArticleTag } from "@/types/dev-article-tag";

const TAGS: DevArticleTag[] = [
  { id: "nextjs", ko: "Next.js", en: "Next.js" },
  { id: "css", ko: "CSS", en: "CSS" },
];

const parse = (query: string) => parseArticleListQuery(new URLSearchParams(query), TAGS);

describe("parseArticleListQuery", () => {
  it("빈 query 는 전체·그리드·1페이지다", () => {
    expect(parse("")).toEqual({ tag: null, view: "grid", page: 1 });
  });

  it("사전에 있는 태그만 받아들인다", () => {
    expect(parse("tag=css").tag).toBe("css");
    // 지운 태그가 남은 링크는 빈 목록 대신 전체를 보여 준다.
    expect(parse("tag=deleted").tag).toBeNull();
    // 라벨로는 찾지 않는다 — id 하나만 URL 계약이다.
    expect(parse("tag=Next.js").tag).toBeNull();
  });

  it("모르는 보기 값은 그리드로 되돌린다", () => {
    expect(parse("view=list").view).toBe("list");
    expect(parse("view=table").view).toBe("grid");
    expect(parse("view=").view).toBe("grid");
  });

  it("숫자가 아니거나 1보다 작은 페이지는 1로 본다", () => {
    expect(parse("page=3").page).toBe(3);
    expect(parse("page=abc").page).toBe(1);
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-2").page).toBe(1);
  });

  it("같은 키가 여러 번 오면 첫 값을 쓴다", () => {
    expect(parse("tag=css&tag=nextjs").tag).toBe("css");
  });
});

describe("buildArticleListHref", () => {
  it("기본값은 생략한다", () => {
    expect(buildArticleListHref("/ko/dev/articles", { tag: null, view: "grid", page: 1 })).toBe(
      "/ko/dev/articles",
    );
  });

  it("키 순서는 tag, view, page 다", () => {
    expect(buildArticleListHref("/ko/dev/articles", { tag: "css", view: "list", page: 2 })).toBe(
      "/ko/dev/articles?tag=css&view=list&page=2",
    );
  });

  it("파싱 결과를 다시 직렬화하면 canonical 주소가 된다", () => {
    const href = buildArticleListHref("/ko/dev/articles", parse("page=99999&sort=old&view=bogus"));
    expect(href).toBe("/ko/dev/articles?page=99999");
  });
});

describe("articlePageCount", () => {
  it("글이 없어도 1페이지다", () => {
    expect(articlePageCount(0)).toBe(1);
  });

  it("한 페이지 정원까지는 1페이지, 넘으면 늘어난다", () => {
    expect(articlePageCount(ARTICLES_PER_PAGE)).toBe(1);
    expect(articlePageCount(ARTICLES_PER_PAGE + 1)).toBe(2);
    expect(articlePageCount(ARTICLES_PER_PAGE * 2)).toBe(2);
  });
});

describe("sliceArticlesPage", () => {
  const items = Array.from({ length: ARTICLES_PER_PAGE + 3 }, (_, index) => index);

  it("페이지 경계에서 나눈다", () => {
    expect(sliceArticlesPage(items, 1)).toHaveLength(ARTICLES_PER_PAGE);
    expect(sliceArticlesPage(items, 2)).toEqual([
      ARTICLES_PER_PAGE,
      ARTICLES_PER_PAGE + 1,
      ARTICLES_PER_PAGE + 2,
    ]);
  });

  it("범위를 벗어난 페이지는 비어 있다", () => {
    expect(sliceArticlesPage(items, 9)).toEqual([]);
  });
});
