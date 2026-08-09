import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  firestoreCollectionCacheTag,
  firestoreDocumentCacheTag,
} from "@/constants/cache";

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

/**
 * 공개 문서를 `order` 순으로 읽는 구조화 쿼리를 만든다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @returns {Record<string, unknown>} Firestore `runQuery`에 전달할 구조화 쿼리.
 */
const publishedOrderedQuery = (collectionId: string) => ({
  from: [{ collectionId }],
  where: {
    fieldFilter: {
      field: { fieldPath: "published" },
      op: "EQUAL",
      value: { booleanValue: true },
    },
  },
  orderBy: [{ field: { fieldPath: "order" }, direction: "ASCENDING" }],
});

/**
 * 공개 문서에서 지정한 필드만 읽는 구조화 쿼리를 만든다.
 *
 * @param {string} collectionId 조회할 Firestore 컬렉션 ID.
 * @param {string[]} fieldPaths 응답에 포함할 필드 경로.
 * @returns {Record<string, unknown>} 필드 선택 조건이 포함된 구조화 쿼리.
 */
const projectedPublishedOrderedQuery = (collectionId: string, fieldPaths: string[]) => ({
  ...publishedOrderedQuery(collectionId),
  select: { fields: fieldPaths.map((fieldPath) => ({ fieldPath })) },
});

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
  const response = await fetch(`${documentsUrl()}:runQuery?key=${API_KEY}`, {
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
 * @param {{ fresh?: boolean }} [options] 캐시 동작을 정하는 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<Record<string, unknown> | null>} 디코딩된 문서. 문서가 없으면 `null`이다.
 */
const fetchDocument = async (
  collectionId: string,
  documentId: string,
  label: string,
  options?: { fresh?: boolean },
): Promise<Record<string, unknown> | null> => {
  const response = await fetch(`${documentsUrl()}/${collectionId}/${documentId}?key=${API_KEY}`, {
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
  runQuery,
  toDate,
};
