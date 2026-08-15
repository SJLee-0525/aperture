import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  collectionCacheTag,
  documentCacheTag,
} from "@/constants/cache";
import { SUPABASE_COLLECTIONS, type CollectionId } from "@/constants/collections";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import { fetchWithRetry } from "@/lib/supabase/public/retry-fetch";

/** 병합이 끝난 공개 행 — 기존 디코더의 `(id, data)` 계약과 같은 모양이다. */
type PublicRow = { id: string; data: Record<string, unknown> };

type SelectOptions = {
  /** PostgREST 필터. 키는 컬럼, 값은 `eq.true` 같은 연산자 포함 표현. */
  filters?: Record<string, string>;
  /** 서술자 기본 정렬을 덮을 order 파라미터. */
  order?: string;
  fresh?: boolean;
  signal?: AbortSignal;
};

const descriptor = (collection: CollectionId) => {
  const found = SUPABASE_COLLECTIONS[collection];
  if (!found) throw new Error(`Supabase 공개 컬렉션 서술자가 없습니다: ${collection}`);
  return found;
};

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
 * 있을 때만 `Date` 로 바꾸는 nullable 타임스탬프 디코더.
 * `publishedAt`·`firstPublishedAt` 은 초안에서 비어 있는 것이 정상 상태라
 * `toDate` 의 epoch 폴백 대신 `null` 을 보존해야 화면의 초안 분기가 깨지지 않는다.
 *
 * @param {unknown} value ISO 문자열 또는 누락 값.
 * @returns {Date | null} 변환된 날짜. 값이 없으면 `null`.
 */
const toNullableDate = (value: unknown): Date | null =>
  typeof value === "string" || typeof value === "number" ? new Date(value) : null;

/**
 * 행을 기존 디코더 입력(camelCase 문서 모양)으로 병합한다.
 * data 를 먼저 펼치고 스칼라 컬럼으로 덮는다 — 마이그레이션 이전 데이터에 남은
 * `data.published`·`data.slug` 잔존값이 DB 스칼라를 이기지 못하게 하는 계약이다.
 */
const mergeRow = (collection: CollectionId, row: Record<string, unknown>): PublicRow => {
  const { hasData, scalars } = descriptor(collection);
  const raw = hasData ? (row.data as Record<string, unknown> | null) : null;
  const data: Record<string, unknown> = { ...(raw ?? {}) };
  for (const [domainKey, columnKey] of Object.entries(scalars)) data[domainKey] = row[columnKey];
  return { id: String(row.id), data };
};

/** publishable key 는 apikey 헤더로만 보낸다. Authorization 은 사용자 토큰 전용이다. */
const baseHeaders = (): Record<string, string> => ({ apikey: supabasePublishableKey() });

const requestRows = async (
  collection: CollectionId,
  params: URLSearchParams,
  cacheTag: string,
  options?: { fresh?: boolean; signal?: AbortSignal },
  label?: string,
): Promise<Array<Record<string, unknown>>> => {
  const { table } = descriptor(collection);
  const response = await fetchWithRetry(`${supabaseUrl()}/rest/v1/${table}?${params.toString()}`, {
    headers: baseHeaders(),
    ...(options?.signal ? { signal: options.signal } : {}),
    ...(options?.fresh
      ? { cache: "no-store" as const }
      : { next: { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS, tags: [cacheTag] } }),
  });
  // 빈 결과(200 + [])와 장애를 구분한다. 설정 실수·429·5xx 를 빈 콘텐츠로 위장하지 않는다.
  if (!response.ok)
    throw new Error(`Supabase ${label ?? collection} 읽기 실패 (${response.status})`);
  return (await response.json()) as Array<Record<string, unknown>>;
};

/**
 * 컬렉션 행을 서술자 projection·정렬로 읽는다. published 게이트가 없는
 * 태그 사전·site 문서까지 다루는 범용 조회다.
 *
 * @returns {Promise<PublicRow[]>} 병합된 행 목록.
 */
const selectRows = async (
  collection: CollectionId,
  options?: SelectOptions,
): Promise<PublicRow[]> => {
  const { select, order } = descriptor(collection);
  const params = new URLSearchParams({ select, order: options?.order ?? order });
  for (const [column, expression] of Object.entries(options?.filters ?? {})) {
    params.set(column, expression);
  }
  const rows = await requestRows(collection, params, collectionCacheTag(collection), options);
  return rows.map((row) => mergeRow(collection, row));
};

/**
 * `published = true` 행만 서술자 정렬로 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @returns {Promise<PublicRow[]>} 병합된 공개 행 목록.
 */
const selectPublished = async (
  collection: CollectionId,
  options?: { fresh?: boolean },
): Promise<PublicRow[]> => {
  if (!descriptor(collection).hasPublished)
    throw new Error(`published 게이트가 없는 컬렉션입니다: ${collection}`);
  return selectRows(collection, { ...options, filters: { published: "eq.true" } });
};

/**
 * 문서 한 건을 읽는다. published 게이트 컬렉션은 공개 행만 조회한다.
 * 응답은 배열로 받아 빈 배열을 `null` 로 해석한다 — 단일 객체 Accept 의 406 의미에
 * 의존하지 않기 위해서다.
 *
 * @param {string} label 오류 메시지에 표시할 문서 이름.
 * @returns {Promise<Record<string, unknown> | null>} 병합된 문서. 없으면 `null`.
 */
const fetchRow = async (
  collection: CollectionId,
  documentId: string,
  label: string,
  options?: { fresh?: boolean; signal?: AbortSignal },
): Promise<Record<string, unknown> | null> => {
  const { select, hasPublished } = descriptor(collection);
  const params = new URLSearchParams({ select });
  params.set("id", `eq.${documentId}`);
  if (hasPublished) params.set("published", "eq.true");
  const rows = await requestRows(
    collection,
    params,
    documentCacheTag(collection, documentId),
    options,
    label,
  );
  const first = rows[0];
  return first ? mergeRow(collection, first).data : null;
};

/**
 * 관리자 access token 으로 문서 한 건을 초안 포함해 읽는다. RAG 증분 동기화 전용이며
 * 인가는 RLS 가 한다 — 토큰이 admin 클레임이 아니면 초안은 빈 결과가 된다.
 *
 * @returns {Promise<Record<string, unknown> | null>} 병합된 문서. 없으면 `null`.
 */
const fetchRowAsUser = async (
  collection: CollectionId,
  documentId: string,
  accessToken: string,
): Promise<Record<string, unknown> | null> => {
  const { table, select } = descriptor(collection);
  const params = new URLSearchParams({ select });
  params.set("id", `eq.${documentId}`);
  const response = await fetch(`${supabaseUrl()}/rest/v1/${table}?${params.toString()}`, {
    headers: { ...baseHeaders(), Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`RAG 원본 조회 실패 (${response.status})`);
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const first = rows[0];
  return first ? mergeRow(collection, first).data : null;
};

export { fetchRow, fetchRowAsUser, mergeRow, selectPublished, selectRows, toDate, toNullableDate };
