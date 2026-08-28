import {
  readBoolean,
  readDate,
  readImageOrNull,
  readNullableDate,
  readString,
  readStringArray,
  readText,
} from "@/lib/supabase/decode/field";

import type { DevArticle } from "@/types/dev-article";

/**
 * 병합된 블로그 글 행을 도메인 모델로 바꾼다. 공개와 관리자가 같은 함수를 쓴다.
 *
 * `slug`·`pinned`·`publishedAt`·`createdAt`·`updatedAt` 은 병합이 행 스칼라로 덮은 값이고
 * `firstPublishedAt` 은 data jsonb 안에 남는다.
 *
 * `coverAlt` 는 대표 이미지가 없을 때 `null` 이 정상 상태다. 빈 이중언어 값으로 채우면
 * "설명이 비었다"와 "이미지가 없다"를 구분할 수 없다.
 *
 * @param id 글 문서 ID.
 * @param data 병합된 글 문서 필드.
 */
const decodeDevArticle = (id: string, data: Record<string, unknown>): DevArticle => ({
  id,
  slug: readString(data.slug),
  title: readText(data.title),
  summary: readText(data.summary),
  body: readString(data.body),
  cover: readImageOrNull(data.cover),
  coverAlt: data.coverAlt ? readText(data.coverAlt) : null,
  tags: readStringArray(data.tags),
  relatedProjectIds: readStringArray(data.relatedProjectIds),
  pinned: readBoolean(data.pinned),
  published: readBoolean(data.published),
  publishedAt: readNullableDate(data.publishedAt),
  firstPublishedAt: readNullableDate(data.firstPublishedAt),
  createdAt: readDate(data.createdAt),
  updatedAt: readDate(data.updatedAt),
});

export { decodeDevArticle };
