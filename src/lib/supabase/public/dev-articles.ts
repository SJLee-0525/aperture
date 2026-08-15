import { COLLECTIONS } from "@/constants/collections";
import { asText } from "@/lib/i18n/as-text";
import {
  fetchRow,
  selectPublished,
  selectRows,
  toDate,
  toNullableDate,
} from "@/lib/supabase/public/transport";

import type { DevArticle, DevArticleProjectLink } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { ImageMeta } from "@/types/image";

/**
 * 챗봇 문맥과 참조 카드가 쓰는 글 투영.
 *
 * 블로그 글은 `order` 가 없다. 정렬 기준이 발행일이라 목록 순서는 저장 시점이 아니라
 * `publishedAt` 내림차순 · 같은 날짜는 id 오름차순이다(`lib/content/dev-articles` 와 같은 계약).
 */
type ChatDevArticle = Pick<DevArticle, "id" | "slug" | "title" | "summary" | "cover" | "tags"> & {
  publishedAt: Date | null;
};

/**
 * PostgREST 행에서 병합된 블로그 글 문서를 공개 페이지 모델로 변환한다.
 * RAG 증분 동기화가 관리자 권한으로 읽은 문서를 같은 모양으로 정규화할 때
 * 재사용하는 규약이므로 export 한다 (`toDevProject` 와 같은 역할).
 *
 * `slug`·`publishedAt`·`createdAt`·`updatedAt` 은 transport 병합이 행 스칼라로 덮은 값이고,
 * `firstPublishedAt` 은 data jsonb 안에 남는다.
 *
 * @param {string} id 문서 ID.
 * @param {Record<string, unknown>} data 병합된 문서 필드.
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
 * 채팅 투영용 디코더. 공개 글이면 `publishedAt` 이 반드시 있지만, 필드가 빠진 비정상
 * 문서에서도 정렬이 무너지지 않도록 `null` 을 그대로 보존한다.
 *
 * @param {string} id 문서 ID.
 * @param {Record<string, unknown>} data 병합된 문서 필드.
 * @returns {ChatDevArticle}
 */
const toChatDevArticle = (id: string, data: Record<string, unknown>): ChatDevArticle => ({
  id,
  slug: (data.slug as string) ?? "",
  title: asText(data.title),
  summary: asText(data.summary),
  cover: (data.cover as ImageMeta | null) ?? null,
  tags: (data.tags as string[]) ?? [],
  publishedAt: toNullableDate(data.publishedAt),
});

/**
 * 공개된 블로그 글을 발행일 내림차순으로 읽는다.
 *
 * 정렬은 서술자의 `published_at.desc.nullslast,id.asc` 가 소유한다 — mock 정렬 계약
 * (`compareByPublishedAtDesc` 의 id 오름차순 보조 정렬)과 순서가 같다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<DevArticle[]>} 발행일 내림차순의 공개 글 목록.
 */
const fetchPublishedDevArticles = async (options?: { fresh?: boolean }): Promise<DevArticle[]> =>
  (await selectPublished(COLLECTIONS.DEV_ARTICLES, options)).map(({ id, data }) =>
    toDevArticle(id, data),
  );

/**
 * 문서 ID 로 공개 글 한 건을 읽는다. 화면 문맥 검증처럼 목록 전체가 필요 없는 조회에 쓴다.
 *
 * RLS 가 초안의 무인증 read 를 막고 쿼리에도 published 게이트가 있어, 초안·부재 모두
 * `null` 로 끝난다. 호출부는 예외와 `null` 을 모두 "확인할 수 없음" 으로 처리해야 한다.
 *
 * @param {string} id 문서 ID.
 * @param {{ fresh?: boolean; signal?: AbortSignal }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<DevArticle | null>} 읽은 글. 없으면 `null`.
 * @throws {Error} 읽기가 실패한 경우.
 */
const fetchDevArticleById = async (
  id: string,
  options?: { fresh?: boolean; signal?: AbortSignal },
): Promise<DevArticle | null> => {
  const data = await fetchRow(COLLECTIONS.DEV_ARTICLES, id, "블로그 글", options);
  return data ? toDevArticle(id, data) : null;
};

/**
 * 블로그 태그 사전을 문서 ID 오름차순으로 읽는다.
 *
 * 태그에는 발행 개념과 `order` 필드가 없다 — 순서 계약은 id 사전순이며 mock 사전이
 * 같은 순서를 유지한다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<DevArticleTag[]>} id 오름차순의 태그 사전.
 */
const fetchDevArticleTags = async (options?: { fresh?: boolean }): Promise<DevArticleTag[]> =>
  (await selectRows(COLLECTIONS.DEV_ARTICLE_TAGS, options)).map(({ id, data }) => ({
    id,
    ko: (data.ko as string) ?? "",
    en: (data.en as string) ?? "",
  }));

/**
 * 챗봇 문맥과 참조 카드에 필요한 글 목록. 행 전체를 받아 본문을 뺀 도메인 투영만 유지한다 —
 * 챗봇이 쓰는 것은 제목·요약·태그·경로이고 본문은 RAG 청크가 맡는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<ChatDevArticle[]>} 발행일 내림차순의 채팅용 글 목록.
 */
const fetchChatDevArticles = async (options?: { fresh?: boolean }): Promise<ChatDevArticle[]> =>
  (await selectPublished(COLLECTIONS.DEV_ARTICLES, options)).map(({ id, data }) =>
    toChatDevArticle(id, data),
  );

/**
 * 프로젝트 역방향 목록에 필요한 관계 필드만 남긴다. 프로젝트 지면은 글 하나도 열지
 * 않으면서 관계만 알면 된다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<DevArticleProjectLink[]>} 발행일 내림차순의 공개 글 관계 목록.
 */
const fetchDevArticleProjectLinks = async (options?: {
  fresh?: boolean;
}): Promise<DevArticleProjectLink[]> =>
  (await selectPublished(COLLECTIONS.DEV_ARTICLES, options)).map(({ id, data }) => ({
    id,
    slug: (data.slug as string) ?? "",
    title: asText(data.title),
    publishedAt: toNullableDate(data.publishedAt),
    relatedProjectIds: (data.relatedProjectIds as string[]) ?? [],
  }));

export {
  fetchChatDevArticles,
  fetchDevArticleById,
  fetchDevArticleProjectLinks,
  fetchDevArticleTags,
  fetchPublishedDevArticles,
  toDevArticle,
};
export type { ChatDevArticle };
