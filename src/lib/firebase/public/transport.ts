import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  firestoreCollectionCacheTag,
  firestoreDocumentCacheTag,
} from "@/constants/cache";
import { fetchWithRetry } from "@/lib/firebase/public/retry-fetch";

type RestValue = Record<string, unknown>;
type RestDocument = { name: string; fields?: Record<string, RestValue> };

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/**
 * 현재 프로젝트의 Firestore REST 문서 기본 URL을 만든다.
 *
 * @returns {string} 기본 데이터베이스의 문서 API URL.
 */
const documentsUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Firestore REST 값 표현을 JavaScript 값으로 재귀 변환한다.
 *
 * @param {RestValue | undefined} value Firestore REST API가 반환한 단일 값.
 * @returns {unknown} 문자열, 숫자, 배열 또는 일반 객체로 디코딩된 값.
 */
const decodeValue = (value: RestValue | undefined): unknown => {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue as string;
  if ("booleanValue" in value) return value.booleanValue as boolean;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue as number;
  if ("timestampValue" in value) return value.timestampValue as string;
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
 * REST 타임스탬프 또는 숫자 값을 `Date`로 변환한다.
 *
 * @param {unknown} value 변환할 ISO 문자열 또는 밀리초 값.
 * @returns {Date} 변환된 날짜. 지원하지 않는 값이면 Unix epoch를 반환한다.
 */
const toDate = (value: unknown): Date => {
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date(0);
};

type QueryDirection = "ASCENDING" | "DESCENDING";
type QueryOrder = { fieldPath: string; direction: QueryDirection };

/**
 * `published == true` 문서를 지정한 정렬로 읽는 구조화 쿼리를 만든다.
 *
 * 마지막 정렬 필드가 DESCENDING 이면 Firestore 가 암묵적으로 붙이는 `__name__` 정렬도
 * DESCENDING 이 된다. 문서 ID 오름차순 계약이 필요한 쿼리(블로그 `publishedAt desc`)는
 * `{ fieldPath: "__name__", direction: "ASCENDING" }` 을 호출부가 직접 명시해야 하며,
 * 배포하는 복합 인덱스에도 같은 `__name__` 방향이 있어야 한다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @param {QueryOrder[]} orderBy 적용 순서대로 나열한 정렬 조건.
 * @param {string[] | undefined} [select] 응답에 포함할 필드 경로. 생략하면 전체 문서를 받는다.
 * @returns {Record<string, unknown>} Firestore `runQuery`에 전달할 구조화 쿼리.
 */
const publishedQuery = (
  collectionId: string,
  orderBy: QueryOrder[],
  select?: string[],
): Record<string, unknown> => ({
  from: [{ collectionId }],
  where: {
    fieldFilter: {
      field: { fieldPath: "published" },
      op: "EQUAL",
      value: { booleanValue: true },
    },
  },
  orderBy: orderBy.map(({ fieldPath, direction }) => ({ field: { fieldPath }, direction })),
  ...(select ? { select: { fields: select.map((fieldPath) => ({ fieldPath })) } } : {}),
});

/** 기존 6개 컬렉션이 공유하는 수동 정렬 조건 — 마지막 필드가 ASC 라 `__name__` 명시가 필요 없다. */
const ORDER_ASC: QueryOrder[] = [{ fieldPath: "order", direction: "ASCENDING" }];

/**
 * 공개 문서를 `order` 순으로 읽는 구조화 쿼리를 만든다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @returns {Record<string, unknown>} Firestore `runQuery`에 전달할 구조화 쿼리.
 */
const publishedOrderedQuery = (collectionId: string) => publishedQuery(collectionId, ORDER_ASC);

/**
 * 공개 문서에서 지정한 필드만 `order` 순으로 읽는 구조화 쿼리를 만든다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @param {string[]} fieldPaths 응답에 포함할 필드 경로.
 * @returns {Record<string, unknown>} 필드 선택 조건이 포함된 구조화 쿼리.
 */
const projectedPublishedOrderedQuery = (collectionId: string, fieldPaths: string[]) =>
  publishedQuery(collectionId, ORDER_ASC, fieldPaths);

/**
 * Firestore REST `runQuery`를 호출하고 문서를 일반 객체로 디코딩한다.
 *
 * @param {Record<string, unknown>} structuredQuery 실행할 Firestore 구조화 쿼리.
 * @param {{ fresh?: boolean }} [options] 캐시 동작을 정하는 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<Array<{ id: string; data: Record<string, unknown> }>>} 문서 ID와 디코딩된 필드 목록.
 */
const runQuery = async (
  structuredQuery: Record<string, unknown>,
  options?: { fresh?: boolean },
): Promise<Array<{ id: string; data: Record<string, unknown> }>> => {
  const collectionIds = (
    (structuredQuery.from as Array<{ collectionId?: string }> | undefined) ?? []
  )
    .map(({ collectionId }) => collectionId)
    .filter((collectionId): collectionId is string => Boolean(collectionId));
  const response = await fetchWithRetry(`${documentsUrl()}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
    ...(options?.fresh
      ? { cache: "no-store" as const }
      : {
          next: {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: collectionIds.map(firestoreCollectionCacheTag),
          },
        }),
  });
  if (!response.ok) throw new Error(`Firestore runQuery 실패 (${response.status})`);

  const rows = (await response.json()) as Array<{ document?: RestDocument }>;
  return rows
    .filter((row): row is { document: RestDocument } => Boolean(row.document))
    .map(({ document }) => ({
      id: document.name.split("/").pop() ?? "",
      data: decodeFields(document.fields ?? {}),
    }));
};

/**
 * Firestore REST API에서 문서 한 건을 읽어 일반 객체로 디코딩한다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @param {string} documentId 조회할 문서 ID.
 * @param {string} label 오류 메시지에 표시할 문서 이름.
 * @param {{ fresh?: boolean; signal?: AbortSignal }} [options] 캐시 동작과 취소를 정하는 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @param {AbortSignal} [options.signal] 요청 취소 신호. 호출자가 제한 시간을 갖는 조회에 넘긴다.
 * @returns {Promise<Record<string, unknown> | null>} 디코딩된 문서. 문서가 없으면 `null`이다.
 */
const fetchDocument = async (
  collectionId: string,
  documentId: string,
  label: string,
  options?: { fresh?: boolean; signal?: AbortSignal },
): Promise<Record<string, unknown> | null> => {
  // 문서 ID 는 요청에서 올 수 있다. slash 를 인코딩하지 않으면 다른 컬렉션 경로로 내려간다.
  const path = `${collectionId}/${encodeURIComponent(documentId)}`;
  const response = await fetchWithRetry(`${documentsUrl()}/${path}?key=${API_KEY}`, {
    ...(options?.signal ? { signal: options.signal } : {}),
    ...(options?.fresh
      ? { cache: "no-store" as const }
      : {
          next: {
            revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS,
            tags: [firestoreDocumentCacheTag(collectionId, documentId)],
          },
        }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore ${label} 읽기 실패 (${response.status})`);

  const document = (await response.json()) as RestDocument;
  return decodeFields(document.fields ?? {});
};

export {
  decodeFields,
  fetchDocument,
  projectedPublishedOrderedQuery,
  publishedOrderedQuery,
  publishedQuery,
  runQuery,
  toDate,
};
