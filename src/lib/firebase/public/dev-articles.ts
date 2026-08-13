import { COLLECTIONS } from "@/constants/collections";
import { publishedQuery, runQuery, toDate } from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { ImageMeta } from "@/types/image";

/**
 * 있을 때만 `Date` 로 바꾸는 nullable 타임스탬프 디코더.
 * `publishedAt`·`firstPublishedAt` 은 초안에서 비어 있는 것이 정상 상태라
 * `toDate` 의 epoch 폴백 대신 `null` 을 보존해야 화면의 초안 분기가 깨지지 않는다.
 *
 * @param {unknown} value REST 응답의 ISO 문자열 또는 누락 값.
 * @returns {Date | null} 변환된 날짜. 값이 없으면 `null`.
 */
const toNullableDate = (value: unknown): Date | null =>
  typeof value === "string" || typeof value === "number" ? new Date(value) : null;

/**
 * REST API 로 읽은 블로그 글 문서를 공개 페이지 모델로 변환한다.
 * B6 의 RAG 증분 동기화가 관리자 권한으로 읽은 raw 문서를 같은 모양으로 정규화할 때
 * 재사용하는 규약이므로 export 한다 (`toDevProject` 와 같은 역할).
 *
 * @param {string} id Firestore 문서 ID.
 * @param {Record<string, unknown>} data 디코딩된 문서 필드.
 * @returns {DevArticle} 다국어 필드와 날짜가 정규화된 글 모델.
 */
const toDevArticle = (id: string, data: Record<string, unknown>): DevArticle => ({
  id,
  slug: (data.slug as string) ?? "",
  title: asText(data.title),
  summary: asText(data.summary),
  body: (data.body as string) ?? "",
  cover: (data.cover as ImageMeta | null) ?? null,
  coverAlt: data.coverAlt ? asText(data.coverAlt) : null,
  tags: (data.tags as string[]) ?? [],
  relatedProjectIds: (data.relatedProjectIds as string[]) ?? [],
  published: (data.published as boolean) ?? false,
  publishedAt: toNullableDate(data.publishedAt),
  firstPublishedAt: toNullableDate(data.firstPublishedAt),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

/**
 * 공개된 블로그 글을 발행일 내림차순으로 읽는다.
 *
 * 정렬은 Firestore 쿼리가 소유한다 — `publishedAt desc` 뒤에 `__name__ asc` 를 명시해
 * mock 정렬 계약(`compareByPublishedAtDesc` 의 id 오름차순 보조 정렬)과 순서를 맞춘다.
 * 명시하지 않으면 Firestore 가 마지막 필드 방향(DESC)을 따라 문서 ID 도 내림차순으로 붙인다.
 * projection 은 쓰지 않는다 — 상세·읽기 시간·목차가 전부 `body` 파생이라 분리 이득이 없다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<DevArticle[]>} 발행일 내림차순의 공개 글 목록.
 */
const fetchPublishedDevArticles = async (options?: { fresh?: boolean }): Promise<DevArticle[]> =>
  (
    await runQuery(
      publishedQuery(COLLECTIONS.DEV_ARTICLES, [
        { fieldPath: "publishedAt", direction: "DESCENDING" },
        { fieldPath: "__name__", direction: "ASCENDING" },
      ]),
      options,
    )
  ).map(({ id, data }) => toDevArticle(id, data));

/**
 * 블로그 태그 사전을 문서 ID 오름차순으로 읽는다.
 *
 * 태그에는 발행 개념이 없어 `publishedQuery` 를 쓰지 않고, `order` 필드도 없다 —
 * 순서 계약은 id 사전순이며 mock 사전이 같은 순서를 유지한다. 단일 필드 `__name__`
 * 정렬이라 복합 인덱스가 필요 없다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<DevArticleTag[]>} id 오름차순의 태그 사전.
 */
const fetchDevArticleTags = async (options?: { fresh?: boolean }): Promise<DevArticleTag[]> =>
  (
    await runQuery(
      {
        from: [{ collectionId: COLLECTIONS.DEV_ARTICLE_TAGS }],
        orderBy: [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }],
      },
      options,
    )
  ).map(({ id, data }) => ({
    id,
    ko: (data.ko as string) ?? "",
    en: (data.en as string) ?? "",
  }));

export { fetchDevArticleTags, fetchPublishedDevArticles, toDevArticle };
