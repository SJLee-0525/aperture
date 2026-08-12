import { STORAGE_KEYS } from "@/constants/storage-keys";
import {
  isRecord,
  readLocalStore,
  warnOnDiscard,
  writeLocalStore,
} from "@/lib/admin/mock/local-store";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";

/**
 * mock 단계에서 Firestore 를 대신하는 브라우저 저장소의 읽기·쓰기.
 *
 * 버전 봉투·JSON 직렬화·용량 초과 처리는 관리자 mock 공용 봉투(`lib/admin/mock/local-store`)가
 * 맡고, 이 파일은 담긴 값의 형 검증만 갖는다. JSON 은 Date 를 담지 못하므로 시각을 ISO
 * 문자열로 바꿔 저장하고 읽을 때 되돌린다. 형이 하나라도 어긋나면 **저장소 전체를 버린다** —
 * 일부만 살리면 어느 글이 사라졌는지 모른 채 편집을 이어가게 되고, 이 저장소는 어차피 mock
 * 글로 다시 채울 수 있다. 운영 데이터가 아니라 개발 편의를 위한 자리라는 계획 §5의 전제를
 * 그대로 따른다.
 */

/** 저장 형식 버전. 필드 계약이 바뀌면 올리고, 과거 값은 승계하지 않고 버린다. v2: 공용 봉투 이관. */
const STORE_VERSION = 2;

type DevArticleStore = { articles: DevArticle[]; tags: DevArticleTag[] };

/**
 * 한·영 텍스트 필드인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is LocalizedText} 두 언어 문자열을 모두 가지면 true.
 */
const isLocalizedText = (value: unknown): value is LocalizedText =>
  isRecord(value) && typeof value.ko === "string" && typeof value.en === "string";

/**
 * 문자열 배열인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is string[]} 모든 원소가 문자열이면 true.
 */
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/**
 * ISO 문자열을 Date 로 되돌린다.
 *
 * @param {unknown} value 저장된 시각 값.
 * @returns {Date | null} 유효한 시각. 형식이 어긋나거나 없으면 null.
 */
const toDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 저장된 이미지 값을 확인한다.
 *
 * @param {unknown} value 저장된 cover 값.
 * @returns {ImageMeta | null | undefined} 유효한 이미지, 없으면 null, 형이 어긋나면 undefined.
 */
const toImage = (value: unknown): ImageMeta | null | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const { url, path, w, h } = value;
  if (typeof url !== "string" || typeof path !== "string") return undefined;
  if (typeof w !== "number" || typeof h !== "number") return undefined;
  return value as unknown as ImageMeta;
};

/**
 * 저장된 글 하나를 검사해 도메인 모델로 되돌린다.
 *
 * @param {unknown} value 저장된 글 한 건.
 * @returns {DevArticle | null} 모든 필드가 계약을 만족하면 글, 아니면 null.
 */
const toArticle = (value: unknown): DevArticle | null => {
  if (!isRecord(value)) return null;
  const cover = toImage(value.cover);
  const createdAt = toDate(value.createdAt);
  const updatedAt = toDate(value.updatedAt);

  if (typeof value.id !== "string" || !value.id) return null;
  if (typeof value.slug !== "string") return null;
  if (!isLocalizedText(value.title) || !isLocalizedText(value.summary)) return null;
  if (typeof value.body !== "string") return null;
  if (cover === undefined) return null;
  if (value.coverAlt !== null && !isLocalizedText(value.coverAlt)) return null;
  if (!isStringArray(value.tags) || !isStringArray(value.relatedProjectIds)) return null;
  if (typeof value.published !== "boolean") return null;
  if (!createdAt || !updatedAt) return null;

  return {
    id: value.id,
    slug: value.slug,
    title: value.title,
    summary: value.summary,
    body: value.body,
    cover,
    coverAlt: value.coverAlt as LocalizedText | null,
    tags: value.tags,
    relatedProjectIds: value.relatedProjectIds,
    published: value.published,
    publishedAt: toDate(value.publishedAt),
    firstPublishedAt: toDate(value.firstPublishedAt),
    createdAt,
    updatedAt,
  };
};

/**
 * 저장된 태그 하나를 검사한다.
 *
 * @param {unknown} value 저장된 태그 한 건.
 * @returns {DevArticleTag | null} 유효한 태그, 아니면 null.
 */
const toTag = (value: unknown): DevArticleTag | null => {
  if (!isRecord(value)) return null;
  const { id, ko, en } = value;
  if (typeof id !== "string" || !id) return null;
  if (typeof ko !== "string" || typeof en !== "string") return null;
  return { id, ko, en };
};

/**
 * 봉투에서 꺼낸 값을 검증해 저장소 형태로 되돌린다.
 *
 * @param {unknown} value 봉투에 담겨 있던 값.
 * @returns {DevArticleStore | null} 글과 태그 전부가 계약을 만족하면 저장소, 아니면 null.
 */
const decodeStore = (value: unknown): DevArticleStore | null => {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.articles) || !Array.isArray(value.tags)) return null;

  const articles = value.articles.map(toArticle);
  const tags = value.tags.map(toTag);
  if (articles.some((article) => article === null) || tags.some((tag) => tag === null)) return null;

  return { articles: articles as DevArticle[], tags: tags as DevArticleTag[] };
};

/**
 * 로컬 저장소를 읽는다.
 *
 * 저장본이 있었는데 쓰지 못한 경우 사유를 콘솔에 남긴다 — 편집한 글이 mock 으로 되돌아간
 * 사실은 화면만 봐서는 알 수 없다.
 *
 * @param {Pick<Storage, "getItem">} storage 읽을 저장소.
 * @returns {DevArticleStore | null} 저장된 글과 태그. 값이 없거나 형이 어긋나면 null이며
 *   호출부는 mock 으로 다시 seed 한다.
 * @throws {Error} 저장소 자체를 읽을 수 없을 때(차단·비활성).
 */
const readDevArticleStore = (storage: Pick<Storage, "getItem">): DevArticleStore | null =>
  readLocalStore(
    storage,
    STORAGE_KEYS.ADMIN_DEV_ARTICLES,
    STORE_VERSION,
    decodeStore,
    warnOnDiscard("블로그 글"),
  );

/**
 * 로컬 저장소를 통째로 덮어쓴다. 용량 초과·차단은 저장 실패로 알린다.
 *
 * @param {Pick<Storage, "setItem">} storage 쓸 저장소.
 * @param {DevArticleStore} store 저장할 글과 태그 전체.
 * @returns {boolean} 저장 성공 여부.
 */
const writeDevArticleStore = (storage: Pick<Storage, "setItem">, store: DevArticleStore): boolean =>
  writeLocalStore(storage, STORAGE_KEYS.ADMIN_DEV_ARTICLES, STORE_VERSION, store);

export { readDevArticleStore, STORE_VERSION, writeDevArticleStore };
export type { DevArticleStore };
