import { cache } from "react";

import { shouldUseMockContent } from "@/lib/content/content-source";
import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 공개 목록 정렬 — 발행일 내림차순, 같은 발행일에는 id 오름차순.
 *
 * 다른 컬렉션이 쓰는 수동 `order` 를 블로그에는 두지 않는다. 관리자가 글 순서를 끌어
 * 옮길 이유가 없고, 발행일이 목록·탐색·pagination 의 공통 기준이기 때문이다.
 * B5 에서 붙일 Firestore 쿼리(`publishedAt desc` + `__name__ asc`)가 같은 순서를 내야 하며,
 * 보조 정렬이 없으면 발행일이 겹치는 글의 페이지 경계가 요청마다 흔들린다.
 *
 * @param {DevArticle} a
 * @param {DevArticle} b
 * @returns {number} `Array.prototype.sort` 비교 결과.
 */
const compareByPublishedAtDesc = (a: DevArticle, b: DevArticle): number => {
  const gap = (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  return gap !== 0 ? gap : a.id.localeCompare(b.id);
};

/**
 * 공개 글 목록. 초안은 제외한다.
 *
 * ⚠️ Firestore 연동은 B5 다. 그때까지 live 소스는 빈 목록을 돌려주고,
 * `fetchPublishedDevArticles` 가 생기면 이 분기만 교체한다. 여기서 throw 하면
 * mock 없이 도는 production build 가 공개 페이지 생성 단계에서 통째로 실패한다.
 *
 * 한 렌더에서 여러 번 불린다(`generateStaticParams`·metadata·페이지 본문) — `cache` 로 감싸
 * 같은 요청 안에서는 한 번만 만든다. B5 에서 Firestore 를 붙여도 읽기가 늘지 않는 장치다.
 *
 * @returns {Promise<DevArticle[]>} 발행일 내림차순 정렬된 공개 글.
 */
const getDevArticles = cache(async (): Promise<DevArticle[]> => {
  if (!shouldUseMockContent()) return [];
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
 * 블로그 태그 사전. 글에는 id 만 저장하므로 라벨은 여기서 찾는다.
 *
 * ⚠️ 저장 위치(별도 컬렉션 여부)는 B5 에서 확정한다.
 *
 * @returns {Promise<DevArticleTag[]>} 사전에 정의된 순서 그대로의 태그 목록.
 */
const getDevArticleTags = cache(async (): Promise<DevArticleTag[]> => {
  if (!shouldUseMockContent()) return [];
  return (await import("@/mocks/dev-article-tags")).MOCK_DEV_ARTICLE_TAGS;
});

export { getDevArticleBySlug, getDevArticles, getDevArticleTags };
