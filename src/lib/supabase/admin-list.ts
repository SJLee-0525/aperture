"use client";

import { asText } from "@/lib/i18n/as-text";
import { requireAdminSession } from "@/lib/supabase/admin/require-admin-session";
import { getSupabaseClient } from "@/lib/supabase/client";

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
 * 주석의 "Firestore 로 바뀌어도 읽는 양이 그대로" 계약).
 *
 * select 별칭 규칙: 객체·배열은 `->`(JSON 타입 보존), 텍스트는 `->>`(Postgres text 추출) —
 * 응답 타입을 명시적으로 고정하기 위한 선택이다.
 * 세션 가드는 RLS 가 초안을 오류 없이 감추는 것을 로그인 오류로 바꾼다.
 */

type Row = Record<string, unknown>;

const listProjected = async (table: string, select: string, orderColumns: string[]) => {
  await requireAdminSession();
  let query = getSupabaseClient().from(table).select(select);
  for (const column of orderColumns) query = query.order(column);
  const { data, error } = await query;
  if (error) throw new Error("관리자 목록을 불러오지 못했습니다.");
  return (data ?? []) as unknown as Row[];
};

/**
 * 알 수 없는 이미지 값을 목록 카드용 이미지 메타데이터로 맞춘다.
 *
 * @param {unknown} value 읽은 이미지 값.
 * @returns {ImageMeta} 이미지 메타데이터. 값이 없으면 빈 이미지다.
 */
const image = (value: unknown): ImageMeta =>
  (value as ImageMeta) ?? { url: "", path: "", w: 0, h: 0 };

/** @returns {Promise<AdminPhotoListItem[]>} 관리자 목록에 필요한 필드만 담은 사진 목록. */
const listPhotoItemsAdmin = async (): Promise<AdminPhotoListItem[]> =>
  (
    await listProjected("photos", "id,published,sort_order,title:data->title,image:data->image", [
      "sort_order",
      "id",
    ])
  ).map((row) => ({
    id: row.id as string,
    title: asText(row.title),
    image: image(row.image),
    order: (row.sort_order as number) ?? 0,
    published: (row.published as boolean) ?? false,
  }));

/** @returns {Promise<AdminAlbumListItem[]>} 관리자 목록에 필요한 필드만 담은 앨범 목록. */
const listAlbumItemsAdmin = async (): Promise<AdminAlbumListItem[]> =>
  (
    await listProjected(
      "albums",
      "id,published,sort_order,title:data->title,coverPhotoId:data->>coverPhotoId,cover:data->cover,photoIds:data->photoIds",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: row.id as string,
    title: asText(row.title),
    coverPhotoId: (row.coverPhotoId as string) ?? "",
    cover: (row.cover as ImageMeta | null) ?? null,
    photoIds: (row.photoIds as string[]) ?? [],
    order: (row.sort_order as number) ?? 0,
    published: (row.published as boolean) ?? false,
  }));

/** @returns {Promise<AdminDevProjectListItem[]>} 관리자 목록에 필요한 필드만 담은 프로젝트 목록. */
const listDevProjectItemsAdmin = async (): Promise<AdminDevProjectListItem[]> =>
  (
    await listProjected(
      "dev_projects",
      "id,published,sort_order,title:data->title,year:data->>year,cover:data->cover",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: row.id as string,
    title: asText(row.title),
    year: (row.year as string) ?? "",
    cover: (row.cover as ImageMeta | null) ?? null,
    order: (row.sort_order as number) ?? 0,
    published: (row.published as boolean) ?? false,
  }));

/** @returns {Promise<AdminMusicWorkListItem[]>} 관리자 목록에 필요한 필드만 담은 연주 목록. */
const listMusicWorkItemsAdmin = async (): Promise<AdminMusicWorkListItem[]> =>
  (
    await listProjected(
      "music_works",
      "id,published,sort_order,title:data->title,performedAt:data->>performedAt,poster:data->poster",
      ["sort_order", "id"],
    )
  ).map((row) => ({
    id: row.id as string,
    title: asText(row.title),
    performedAt: new Date((row.performedAt as string) ?? 0),
    poster: image(row.poster),
    order: (row.sort_order as number) ?? 0,
    published: (row.published as boolean) ?? false,
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
      "dev_articles",
      "id,published,slug,published_at,updated_at,title:data->title,tags:data->tags",
      ["id"],
    )
  ).map((row) => ({
    id: row.id as string,
    slug: (row.slug as string) ?? "",
    title: asText(row.title),
    tags: (row.tags as string[]) ?? [],
    published: (row.published as boolean) ?? false,
    publishedAt: row.published_at ? new Date(row.published_at as string) : null,
    updatedAt: new Date((row.updated_at as string) ?? 0),
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
  (await listProjected("dev_articles", "id,cover:data->cover,body:data->>body", ["id"])).map(
    (row) => ({
      cover: (row.cover as ImageMeta | null) ?? null,
      body: (row.body as string) ?? "",
    }),
  );

export {
  listAlbumItemsAdmin,
  listDevArticleImageRefsAdmin,
  listDevArticleItemsAdmin,
  listDevProjectItemsAdmin,
  listMusicWorkItemsAdmin,
  listPhotoItemsAdmin,
};
