"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { asText } from "@/lib/i18n/as-text";

import type {
  AdminAlbumListItem,
  AdminDevArticleListItem,
  AdminDevProjectListItem,
  AdminMusicWorkListItem,
  AdminPhotoListItem,
} from "@/types/admin";
import type { ImageMeta } from "@/types/image";

/** projection 쿼리가 받는 정렬 조건. 공개 transport 의 `QueryOrder` 와 같은 모양이다. */
type ProjectedQueryOrder = { fieldPath: string; direction: "ASCENDING" | "DESCENDING" };

type RestValue = Record<string, unknown>;
type RestDocument = { name: string; fields?: Record<string, RestValue> };

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
/** @returns {string} 현재 프로젝트의 Firestore REST 문서 기본 URL. */
const documentsUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Firestore REST 값 표현을 JavaScript 값으로 재귀 변환한다.
 *
 * @param {RestValue | undefined} value Firestore REST API가 반환한 단일 값.
 * @returns {unknown} 디코딩된 값.
 */
const decodeValue = (value: RestValue | undefined): unknown => {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, RestValue> }).fields ?? {};
    return decodeFields(fields);
  }
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: RestValue[] }).values ?? [];
    return values.map(decodeValue);
  }
  return null;
};

/**
 * Firestore 문서의 필드 맵을 일반 객체로 변환한다.
 *
 * @param {Record<string, RestValue>} fields Firestore REST 형식의 문서 필드.
 * @returns {Record<string, unknown>} 키를 유지한 디코딩 결과.
 */
const decodeFields = (fields: Record<string, RestValue>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));

/**
 * 관리자 토큰으로 컬렉션의 지정 필드만 읽는다.
 *
 * 기본 정렬은 기존 4개 컬렉션이 공유하는 `order` 오름차순이다. `orderBy` 필드가 없는
 * 문서는 Firestore 가 결과에서 제외하므로, 초안이 필드를 비워 두는 컬렉션(블로그의
 * `publishedAt`)은 모든 문서가 가진 `__name__` 정렬을 지정해야 초안까지 전량이 온다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @param {string[]} fieldPaths 응답에 포함할 필드 경로.
 * @param {ProjectedQueryOrder[]} [orderBy] 적용할 정렬 조건. 생략하면 `order` 오름차순.
 * @returns {Promise<Array<{ id: string; data: Record<string, unknown> }>>} 문서 ID와 디코딩된 필드 목록.
 */
const listProjected = async (
  collectionId: string,
  fieldPaths: string[],
  orderBy: ProjectedQueryOrder[] = [{ fieldPath: "order", direction: "ASCENDING" }],
): Promise<Array<{ id: string; data: Record<string, unknown> }>> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("관리자 로그인이 필요합니다.");
  const token = await user.getIdToken();
  const response = await fetch(`${documentsUrl()}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        select: { fields: fieldPaths.map((fieldPath) => ({ fieldPath })) },
        from: [{ collectionId }],
        orderBy: orderBy.map(({ fieldPath, direction }) => ({ field: { fieldPath }, direction })),
      },
    }),
  });
  if (!response.ok) throw new Error(`관리자 목록을 불러오지 못했습니다. (${response.status})`);
  const rows = (await response.json()) as Array<{ document?: RestDocument }>;
  return rows.flatMap(({ document }) =>
    document
      ? [
          {
            id: document.name.split("/").pop() ?? "",
            data: decodeFields(document.fields ?? {}),
          },
        ]
      : [],
  );
};

/**
 * 알 수 없는 이미지 값을 목록 카드용 이미지 메타데이터로 맞춘다.
 *
 * @param {unknown} value Firestore에서 읽은 이미지 값.
 * @returns {ImageMeta} 이미지 메타데이터. 값이 없으면 빈 이미지다.
 */
const image = (value: unknown): ImageMeta =>
  (value as ImageMeta) ?? { url: "", path: "", w: 0, h: 0 };

/** @returns {Promise<AdminPhotoListItem[]>} 관리자 목록에 필요한 필드만 담은 사진 목록. */
const listPhotoItemsAdmin = async (): Promise<AdminPhotoListItem[]> =>
  (await listProjected("photos", ["title", "image", "order", "published"])).map(({ id, data }) => ({
    id,
    title: asText(data.title),
    image: image(data.image),
    order: (data.order as number) ?? 0,
    published: (data.published as boolean) ?? false,
  }));

/** @returns {Promise<AdminAlbumListItem[]>} 관리자 목록에 필요한 필드만 담은 앨범 목록. */
const listAlbumItemsAdmin = async (): Promise<AdminAlbumListItem[]> =>
  (
    await listProjected("albums", [
      "title",
      "coverPhotoId",
      "cover",
      "photoIds",
      "order",
      "published",
    ])
  ).map(({ id, data }) => ({
    id,
    title: asText(data.title),
    coverPhotoId: (data.coverPhotoId as string) ?? "",
    cover: (data.cover as ImageMeta | null) ?? null,
    photoIds: (data.photoIds as string[]) ?? [],
    order: (data.order as number) ?? 0,
    published: (data.published as boolean) ?? false,
  }));

/** @returns {Promise<AdminDevProjectListItem[]>} 관리자 목록에 필요한 필드만 담은 프로젝트 목록. */
const listDevProjectItemsAdmin = async (): Promise<AdminDevProjectListItem[]> =>
  (await listProjected("devProjects", ["title", "year", "cover", "order", "published"])).map(
    ({ id, data }) => ({
      id,
      title: asText(data.title),
      year: (data.year as string) ?? "",
      cover: (data.cover as ImageMeta | null) ?? null,
      order: (data.order as number) ?? 0,
      published: (data.published as boolean) ?? false,
    }),
  );

/** @returns {Promise<AdminMusicWorkListItem[]>} 관리자 목록에 필요한 필드만 담은 연주 목록. */
const listMusicWorkItemsAdmin = async (): Promise<AdminMusicWorkListItem[]> =>
  (await listProjected("musicWorks", ["title", "performedAt", "poster", "order", "published"])).map(
    ({ id, data }) => ({
      id,
      title: asText(data.title),
      performedAt: new Date((data.performedAt as string) ?? 0),
      poster: image(data.poster),
      order: (data.order as number) ?? 0,
      published: (data.published as boolean) ?? false,
    }),
  );

/**
 * 관리자 블로그 목록 — 수십 KB짜리 `body` 를 빼고 목록 행 필드만 읽는다.
 *
 * 정렬은 `__name__` 오름차순뿐이다. `publishedAt` 정렬을 걸면 그 필드가 없는 초안이
 * 결과에서 통째로 사라진다 — 관리자 목록의 표시 순서(발행일 내림차순, 초안 맨 위)는
 * 화면 훅의 순수 함수(`dev-article-sort`)가 담당한다.
 *
 * @returns {Promise<AdminDevArticleListItem[]>} 초안을 포함한 전체 글의 목록 행.
 */
const listDevArticleItemsAdmin = async (): Promise<AdminDevArticleListItem[]> =>
  (
    await listProjected(
      "devArticles",
      ["slug", "title", "tags", "published", "publishedAt", "updatedAt"],
      [{ fieldPath: "__name__", direction: "ASCENDING" }],
    )
  ).map(({ id, data }) => ({
    id,
    slug: (data.slug as string) ?? "",
    title: asText(data.title),
    tags: (data.tags as string[]) ?? [],
    published: (data.published as boolean) ?? false,
    publishedAt: data.publishedAt ? new Date(data.publishedAt as string) : null,
    updatedAt: new Date((data.updatedAt as string) ?? 0),
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
      "devArticles",
      ["cover", "body"],
      [{ fieldPath: "__name__", direction: "ASCENDING" }],
    )
  ).map(({ data }) => ({
    cover: (data.cover as ImageMeta | null) ?? null,
    body: (data.body as string) ?? "",
  }));

export {
  listAlbumItemsAdmin,
  listDevArticleImageRefsAdmin,
  listDevArticleItemsAdmin,
  listDevProjectItemsAdmin,
  listMusicWorkItemsAdmin,
  listPhotoItemsAdmin,
};
