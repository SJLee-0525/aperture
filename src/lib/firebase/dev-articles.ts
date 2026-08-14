import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

import { firestoreCollectionCacheTag } from "@/constants/cache";
import { COLLECTIONS } from "@/constants/collections";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { getFirebaseDb } from "@/lib/firebase/client";
import { devArticleRagPolicy } from "@/lib/firebase/dev-article-rag-policy";
import { listCrud } from "@/lib/firebase/list-crud";
import { asText } from "@/lib/i18n/as-text";

import type { DevArticle } from "@/types/dev-article";
import type { DevArticleTag } from "@/types/dev-article-tag";
import type { ImageMeta } from "@/types/image";

/**
 * 클라이언트 SDK Timestamp 를 nullable `Date` 로 바꾼다.
 * `publishedAt`·`firstPublishedAt` 은 초안에서 비어 있는 것이 정상이라
 * 값이 없으면 REST 디코더와 같이 `null`을 보존한다.
 *
 * @param {unknown} value Firestore Timestamp 또는 누락 값.
 * @returns {Date | null} 변환된 날짜. 값이 없으면 `null`.
 */
const timestampToDate = (value: unknown): Date | null =>
  value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : null;

/**
 * 클라이언트 SDK 로 읽은 블로그 글 문서를 관리자 편집 모델로 정규화한다.
 * REST 경로의 `toDevArticle`과 같은 기본값을 사용한다.
 *
 * @param {string} id Firestore 문서 ID.
 * @param {DocumentData} d Firestore에서 읽은 문서 필드.
 * @returns {DevArticle} 날짜와 기본값이 정규화된 글 모델.
 */
const toDevArticleEntity = (id: string, d: DocumentData): DevArticle => ({
  id,
  slug: d.slug ?? "",
  title: asText(d.title),
  summary: asText(d.summary),
  body: d.body ?? "",
  cover: (d.cover as ImageMeta | null) ?? null,
  coverAlt: d.coverAlt ? asText(d.coverAlt) : null,
  tags: d.tags ?? [],
  relatedProjectIds: d.relatedProjectIds ?? [],
  published: d.published ?? false,
  publishedAt: timestampToDate(d.publishedAt),
  firstPublishedAt: timestampToDate(d.firstPublishedAt),
  createdAt: timestampToDate(d.createdAt) ?? new Date(0),
  updatedAt: timestampToDate(d.updatedAt) ?? new Date(0),
});

/**
 * 블로그 글 CRUD. 발행 조건·firstPublishedAt 스탬프 같은 도메인 규칙은 여기 없고
 * 도메인 검증은 live 저장소가 이 CRUD를 감싸서 적용한다.
 *
 * RAG 동기화는 `devArticleRagPolicy` 가 판정한다. 초안 저장과 발행일·이미지·연관 프로젝트만
 * 바뀐 저장은 요청을 보내지 않는다.
 */
const devArticlesCrud = listCrud<DevArticle>(
  COLLECTIONS.DEV_ARTICLES,
  toDevArticleEntity,
  "블로그 글",
  "article",
  devArticleRagPolicy,
);

/**
 * slug 를 이미 쓰는 다른 글의 문서 ID를 찾는다. 초안을 포함한 서버 데이터 기준이라,
 * 참조 목록이 로드 중일 때 폼 검사가 놓치는 중복 저장 창을 여기서 닫는다.
 * 단일 필드 자동 인덱스로 동작하며 별도 인덱스 배포가 필요 없다.
 *
 * @param {string} slug 검사할 slug. 빈 값은 초안끼리 겹칠 수 있어 검사하지 않는다.
 * @param {string} selfId 편집 중인 글의 문서 ID. 자기 자신은 중복으로 세지 않는다.
 * @returns {Promise<string | null>} slug 를 선점한 다른 글의 ID. 없으면 `null`.
 */
const findArticleSlugOwner = async (slug: string, selfId: string): Promise<string | null> => {
  if (!slug) return null;
  const snap = await getDocs(
    query(collection(getFirebaseDb(), COLLECTIONS.DEV_ARTICLES), where("slug", "==", slug)),
  );
  return snap.docs.find((docSnap) => docSnap.id !== selfId)?.id ?? null;
};

const TAGS_CACHE_TAG = firestoreCollectionCacheTag(COLLECTIONS.DEV_ARTICLE_TAGS);

/**
 * 태그 전체를 공개 getter와 같은 ID 오름차순으로 읽는다.
 * 문서 ID가 태그 id 이므로 클라이언트 정렬로 `__name__` 순서를 재현한다.
 *
 * @returns {Promise<DevArticleTag[]>} id 오름차순의 태그 사전.
 */
const listDevArticleTagsAdmin = async (): Promise<DevArticleTag[]> => {
  try {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTIONS.DEV_ARTICLE_TAGS));
    return snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ko: (docSnap.data().ko as string) ?? "",
        en: (docSnap.data().en as string) ?? "",
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  } catch {
    throw new Error("태그 목록을 불러오지 못했습니다.");
  }
};

/**
 * 태그 ID를 문서 ID로 사용하며 기존 문서는 덮어쓰지 않는다.
 * (`setDoc` 은 기본이 덮어쓰기라 존재 검사를 먼저 한다).
 *
 * @param {DevArticleTag} tag 저장할 태그. id 는 문서 ID로 쓰고 필드에는 라벨만 남긴다.
 * @returns {Promise<void>} 저장과 공개 캐시 갱신이 끝나면 완료된다.
 */
const createDevArticleTag = async (tag: DevArticleTag): Promise<void> => {
  const ref = doc(getFirebaseDb(), COLLECTIONS.DEV_ARTICLE_TAGS, tag.id);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error("같은 id의 태그가 이미 있습니다.");
  try {
    await setDoc(ref, { ko: tag.ko, en: tag.en });
  } catch {
    throw new Error("태그 저장에 실패했습니다.");
  }
  requestPublicRevalidate(TAGS_CACHE_TAG);
};

/**
 * 태그 라벨만 수정한다. 태그 ID는 글이 참조하므로 바꾸지 않는다.
 * id 변경이 필요하면 새 태그를 만들고 글을 옮긴 뒤 지운다.
 *
 * @param {DevArticleTag} tag 수정할 태그. id 로 문서를 찾고 ko/en 만 갱신한다.
 * @returns {Promise<void>} 저장과 공개 캐시 갱신이 끝나면 완료된다.
 */
const updateDevArticleTag = async (tag: DevArticleTag): Promise<void> => {
  try {
    await updateDoc(doc(getFirebaseDb(), COLLECTIONS.DEV_ARTICLE_TAGS, tag.id), {
      ko: tag.ko,
      en: tag.en,
    });
  } catch {
    throw new Error("태그 수정에 실패했습니다.");
  }
  requestPublicRevalidate(TAGS_CACHE_TAG);
};

/**
 * 태그 문서를 삭제한다. 사용 글 수 검증은 저장소(`live-dev-article-repository`)가
 * 사용 여부 검사는 저장소에서 먼저 수행하고 여기서는 문서와 캐시만 갱신한다.
 *
 * @param {string} id 삭제할 태그 id.
 * @returns {Promise<void>} 삭제와 공개 캐시 갱신이 끝나면 완료된다.
 */
const removeDevArticleTag = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.DEV_ARTICLE_TAGS, id));
  } catch {
    throw new Error("태그 삭제에 실패했습니다.");
  }
  requestPublicRevalidate(TAGS_CACHE_TAG);
};

export {
  createDevArticleTag,
  devArticlesCrud,
  findArticleSlugOwner,
  listDevArticleTagsAdmin,
  removeDevArticleTag,
  toDevArticleEntity,
  updateDevArticleTag,
};
