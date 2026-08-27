"use client";

import { COLLECTIONS, tableFor } from "@/constants/collections";
import { requireAdminSession } from "@/lib/supabase/admin/require-admin-session";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  readBoolean,
  readDate,
  readImage,
  readImageOrNull,
  readNullableDate,
  readNumber,
  readString,
  readStringArray,
  readText,
} from "@/lib/supabase/decode/field";
import { paginateAll } from "@/lib/supabase/paginate-all";

import type {
  AdminAlbumListItem,
  AdminDevArticleListItem,
  AdminDevProjectListItem,
  AdminMusicWorkListItem,
  AdminPhotoListItem,
} from "@/types/admin";
import type { ImageMeta } from "@/types/image";

/**
 * 관리자 목록 projection — 목록 화면이 받는 양을 계약으로 잠근다(`AdminListRepository`
 * 주석의 "저장소 구현이 바뀌어도 읽는 양이 그대로" 계약).
 *
 * select 별칭 규칙: 객체·배열은 `->`(JSON 타입 보존), 텍스트는 `->>`(Postgres text 추출) —
 * 응답 타입을 명시적으로 고정하기 위한 선택이다.
 * 세션 가드는 RLS 가 초안을 오류 없이 감추는 것을 로그인 오류로 바꾼다.
 *
 * 테이블명은 서술자(`tableFor`)에서 읽고 select 와 정렬 컬럼만 호출부에 남긴다.
 * select 는 화면마다 읽는 양이 달라 여섯이 모두 다르고 `dev_articles` 는 목록용과
 * 이미지 참조용 둘을 갖는다. 정렬 컬럼이 서술자 order 와 다른 것도 의도다(:120-121).
 */

type Row = Record<string, unknown>;

const listProjected = async (table: string, select: string, orderColumns: string[]) => {
  await requireAdminSession();
  // 페이지네이션이 없으면 PostgREST 가 max_rows 에서 조용히 잘라, 뒷부분 항목이 화면에서
  // 사라진 채 재정렬이 그 상태를 저장한다. orderColumns 의 id 2차 키가 경계를 고정한다.
  return paginateAll<Row>(async (offset, size) => {
    let query = getSupabaseClient().from(table).select(select);
    for (const column of orderColumns) query = query.order(column);
    const { data, error } = await query.range(offset, offset + size - 1);
    if (error) throw new Error("관리자 목록을 불러오지 못했습니다.");
    return (data ?? []) as unknown as Row[];
  });
};

/**
 * 목록 projection 은 도메인 엔티티가 아니라 화면 카드용 축약 행이라 컬렉션 디코더를
 * 쓰지 않는다. 대신 같은 필드 리더를 공유해 "관리자 목록은 1970, 편집기는 오늘" 같은
 * 폴백 불일치가 생기지 않게 한다.
 */

/** @returns {Promise<AdminPhotoListItem[]>} 관리자 목록에 필요한 필드만 담은 사진 목록. */
const listPhotoItemsAdmin = async (): Promise<AdminPhotoListItem[]> =>
  (
    await listProjected(
      tableFor(COLLECTIONS.PHOTOS),
      "id,published,sort_order,title:data->title,image:data->image,tags:data->tags",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: readString(row.id),
    title: readText(row.title),
    image: readImage(row.image),
    tags: readStringArray(row.tags),
    order: readNumber(row.sort_order),
    published: readBoolean(row.published),
  }));

/** @returns {Promise<AdminAlbumListItem[]>} 관리자 목록에 필요한 필드만 담은 앨범 목록. */
const listAlbumItemsAdmin = async (): Promise<AdminAlbumListItem[]> =>
  (
    await listProjected(
      tableFor(COLLECTIONS.ALBUMS),
      "id,published,sort_order,title:data->title,coverPhotoId:data->>coverPhotoId,cover:data->cover,photoIds:data->photoIds",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: readString(row.id),
    title: readText(row.title),
    coverPhotoId: readString(row.coverPhotoId),
    cover: readImageOrNull(row.cover),
    photoIds: readStringArray(row.photoIds),
    order: readNumber(row.sort_order),
    published: readBoolean(row.published),
  }));

/** @returns {Promise<AdminDevProjectListItem[]>} 관리자 목록에 필요한 필드만 담은 프로젝트 목록. */
const listDevProjectItemsAdmin = async (): Promise<AdminDevProjectListItem[]> =>
  (
    await listProjected(
      tableFor(COLLECTIONS.DEV_PROJECTS),
      "id,published,sort_order,title:data->title,year:data->>year,cover:data->cover",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: readString(row.id),
    title: readText(row.title),
    year: readString(row.year),
    cover: readImageOrNull(row.cover),
    order: readNumber(row.sort_order),
    published: readBoolean(row.published),
  }));

/** @returns {Promise<AdminMusicWorkListItem[]>} 관리자 목록에 필요한 필드만 담은 연주 목록. */
const listMusicWorkItemsAdmin = async (): Promise<AdminMusicWorkListItem[]> =>
  (
    await listProjected(
      tableFor(COLLECTIONS.MUSIC_WORKS),
      "id,published,sort_order,title:data->title,performedAt:data->>performedAt,poster:data->poster",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: readString(row.id),
    title: readText(row.title),
    performedAt: readDate(row.performedAt),
    poster: readImage(row.poster),
    order: readNumber(row.sort_order),
    published: readBoolean(row.published),
  }));

/**
 * 관리자 블로그 목록 — 수십 KB짜리 `body` 를 빼고 목록 행 필드만 읽는다.
 *
 * 정렬은 id 오름차순뿐이다. 관리자 목록의 표시 순서(발행일 내림차순, 초안 맨 위)는
 * 화면 훅의 순수 함수(`dev-article-sort`)가 담당한다.
 *
 * @returns {Promise<AdminDevArticleListItem[]>} 초안을 포함한 전체 글의 목록 행.
 */
const listDevArticleItemsAdmin = async (): Promise<AdminDevArticleListItem[]> =>
  (
    await listProjected(
      tableFor(COLLECTIONS.DEV_ARTICLES),
      "id,published,pinned,slug,published_at,updated_at,title:data->title,tags:data->tags",
      ["id"],
    )
  ).map((row) => ({
    id: readString(row.id),
    slug: readString(row.slug),
    title: readText(row.title),
    tags: readStringArray(row.tags),
    pinned: readBoolean(row.pinned),
    published: readBoolean(row.published),
    publishedAt: readNullableDate(row.published_at),
    updatedAt: readDate(row.updated_at),
  }));

/**
 * 미사용 이미지 검사에서 참조 목록을 만들 때 읽는 글별 이미지 정보. 대표 이미지 메타와
 * 본문 Markdown 원문. 초안을 포함한 전체 글이 와야 초안 전용 이미지를 지우지 않는다.
 *
 * @returns {Promise<Array<{ cover: ImageMeta | null; body: string }>>} 글별 cover·body.
 */
const listDevArticleImageRefsAdmin = async (): Promise<
  Array<{ cover: ImageMeta | null; body: string }>
> =>
  (
    await listProjected(
      tableFor(COLLECTIONS.DEV_ARTICLES),
      "id,cover:data->cover,body:data->>body",
      ["id"],
    )
  ).map((row) => ({
    cover: readImageOrNull(row.cover),
    body: readString(row.body),
  }));

export {
  listAlbumItemsAdmin,
  listDevArticleImageRefsAdmin,
  listDevArticleItemsAdmin,
  listDevProjectItemsAdmin,
  listMusicWorkItemsAdmin,
  listPhotoItemsAdmin,
};
