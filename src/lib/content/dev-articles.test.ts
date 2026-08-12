import { describe, expect, it } from "vitest";

import { getDevArticleBySlug, getDevArticles, getDevArticleTags } from "@/lib/content/dev-articles";
import { MOCK_DEV_PROJECT_DETAILS, MOCK_DEV_PROJECTS } from "@/mocks/dev";
import { MOCK_DEV_ARTICLES } from "@/mocks/dev-articles";

describe("getDevArticles", () => {
  it("초안을 공개 목록에서 제외한다", async () => {
    const articles = await getDevArticles();
    const draft = MOCK_DEV_ARTICLES.find((article) => !article.published);

    expect(draft).toBeDefined();
    expect(articles.some((article) => article.id === draft?.id)).toBe(false);
    expect(articles.every((article) => article.publishedAt !== null)).toBe(true);
  });

  it("발행일 내림차순으로 정렬하고 같은 발행일에는 id 오름차순을 적용한다", async () => {
    const articles = await getDevArticles();
    const times = articles.map((article) => article.publishedAt?.getTime() ?? 0);

    expect(times).toEqual([...times].sort((a, b) => b - a));

    // 발행일이 겹치는 글이 없으면 보조 정렬을 확인할 수 없다.
    const tiedIndexes = times.flatMap((time, index) => (time === times[index + 1] ? [index] : []));
    expect(tiedIndexes.length).toBeGreaterThan(0);
    tiedIndexes.forEach((index) => {
      expect(articles[index].id < articles[index + 1].id).toBe(true);
    });
  });
});

describe("getDevArticleBySlug", () => {
  it("공개된 글의 slug 로 글을 찾는다", async () => {
    const [first] = await getDevArticles();
    await expect(getDevArticleBySlug(first.slug)).resolves.toMatchObject({ id: first.id });
  });

  it("초안 slug 와 없는 slug 는 모두 null 이다", async () => {
    const draft = MOCK_DEV_ARTICLES.find((article) => !article.published);

    await expect(getDevArticleBySlug(draft?.slug ?? "")).resolves.toBeNull();
    await expect(getDevArticleBySlug("no-such-article")).resolves.toBeNull();
  });
});

describe("getDevArticleTags", () => {
  it("글이 참조하는 태그 id 가 모두 사전에 있다", async () => {
    const tags = await getDevArticleTags();
    const known = new Set(tags.map((tag) => tag.id));

    MOCK_DEV_ARTICLES.forEach((article) => {
      article.tags.forEach((id) => expect(known.has(id)).toBe(true));
    });
  });
});

describe("mock 연관 프로젝트", () => {
  it("실제 프로젝트 mock 에 있는 id 만 참조한다", () => {
    const known = new Set(
      [...MOCK_DEV_PROJECTS, ...MOCK_DEV_PROJECT_DETAILS].map((project) => project.id),
    );

    MOCK_DEV_ARTICLES.forEach((article) => {
      article.relatedProjectIds.forEach((id) => expect(known.has(id)).toBe(true));
    });
  });
});
