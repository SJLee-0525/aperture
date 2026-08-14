import { cache } from "react";

import { compareByPublishedAtDesc } from "@/lib/content/article-order";
import { shouldUseMockContent } from "@/lib/content/content-source";
import {
  fetchDevArticleProjectLinks,
  fetchDevArticleTags,
  fetchPublishedDevArticles,
} from "@/lib/firebase/public/dev-articles";

import type { DevArticle, DevArticleProjectLink } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 공개 글 목록. 초안은 제외한다.
 *
 * live 소스는 Firestore REST 쿼리가 정렬(`publishedAt desc + __name__ asc`)까지 마친
 * 결과를 그대로 쓰고, mock 만 같은 계약의 `compareByPublishedAtDesc` 로 정렬한다.
 *
 * 한 렌더에서 여러 번 불린다(`generateStaticParams`·metadata·페이지 본문) — `cache` 로 감싸
 * 같은 요청 안에서는 한 번만 만든다. Firestore 읽기가 렌더당 1회로 억제되는 장치다.
 *
 * @returns {Promise<DevArticle[]>} 발행일 내림차순 정렬된 공개 글.
 */
const getDevArticles = cache(async (): Promise<DevArticle[]> => {
  if (!shouldUseMockContent()) return fetchPublishedDevArticles();
  const { MOCK_DEV_ARTICLES } = await import("@/mocks/dev-articles");
  return MOCK_DEV_ARTICLES.filter((article) => article.published).sort(compareByPublishedAtDesc);
});

/**
 * slug 로 공개 글 한 건을 찾는다. 초안과 없는 slug 는 모두 `null` 이다.
 *
 * @param {string} slug URL 세그먼트로 받은 식별자.
 * @returns {Promise<DevArticle | null>} 공개된 글 또는 `null`.
 */
const getDevArticleBySlug = async (slug: string): Promise<DevArticle | null> =>
  (await getDevArticles()).find((article) => article.slug === slug) ?? null;

/**
 * 프로젝트 역방향 목록이 쓰는 글 관계 투영.
 *
 * 프로젝트 지면에서 `getDevArticles` 를 쓰지 않는 이유는 본문이다. 관계만 필요한 화면이
 * 모든 글의 Markdown 원문을 서버로 끌어오지 않게 필드를 좁힌 조회를 따로 둔다.
 *
 * @returns {Promise<DevArticleProjectLink[]>} 발행일 내림차순의 공개 글 관계 목록.
 */
const getDevArticleProjectLinks = cache(async (): Promise<DevArticleProjectLink[]> => {
  if (!shouldUseMockContent()) return fetchDevArticleProjectLinks();
  const { MOCK_DEV_ARTICLES } = await import("@/mocks/dev-articles");
  return MOCK_DEV_ARTICLES.filter((article) => article.published)
    .sort(compareByPublishedAtDesc)
    .map(({ id, slug, title, publishedAt, relatedProjectIds }) => ({
      id,
      slug,
      title,
      publishedAt,
      relatedProjectIds,
    }));
});

/**
 * 블로그 태그 사전. 글에는 id 만 저장하므로 라벨은 여기서 찾는다.
 *
 * 저장 위치는 `devArticleTags` 컬렉션이다. 순서 계약은 id 사전순 —
 * live 는 문서 ID(`__name__`) 오름차순 쿼리, mock 은 같은 순서로 정의된 배열이다.
 *
 * @returns {Promise<DevArticleTag[]>} id 오름차순의 태그 목록.
 */
const getDevArticleTags = cache(async (): Promise<DevArticleTag[]> => {
  if (!shouldUseMockContent()) return fetchDevArticleTags();
  return (await import("@/mocks/dev-article-tags")).MOCK_DEV_ARTICLE_TAGS;
});

export { getDevArticleBySlug, getDevArticleProjectLinks, getDevArticles, getDevArticleTags };
