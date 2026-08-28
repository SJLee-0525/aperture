import "server-only";

import {
  PUBLIC_CACHE_REVALIDATE_SECONDS,
  collectionCacheTag,
  documentCacheTag,
} from "@/constants/cache";
import { SUPABASE_COLLECTIONS, type TableCollectionId } from "@/constants/collections";
import { paginateAll } from "@/lib/supabase/paginate-all";
import { restFetch } from "@/lib/supabase/rest-client";
import { mergeRow } from "@/lib/supabase/row-merge";

import type { MergedRow } from "@/lib/supabase/row-merge";

type SelectOptions = {
  /** PostgREST 필터. 키는 컬럼, 값은 `eq.true` 같은 연산자 포함 표현. */
  filters?: Record<string, string>;
  /** 서술자 기본 정렬을 덮을 order 파라미터. */
  order?: string;
  fresh?: boolean;
  signal?: AbortSignal;
};

const descriptor = (collection: TableCollectionId) => SUPABASE_COLLECTIONS[collection];

const requestRows = async (
  collection: TableCollectionId,
  params: URLSearchParams,
  cacheTag: string,
  options?: { fresh?: boolean; signal?: AbortSignal },
  label?: string,
): Promise<Array<Record<string, unknown>>> => {
  const { table } = descriptor(collection);
  const response = await restFetch({
    path: table,
    params,
    // 정적 생성은 읽기 한 번이 실패하면 빌드를 중단한다. 공개 읽기는 전부 재시도한다.
    retry: true,
    ...(options?.signal ? { signal: options.signal } : {}),
    ...(options?.fresh
      ? {}
      : { cache: { revalidate: PUBLIC_CACHE_REVALIDATE_SECONDS, tags: [cacheTag] } }),
  });
  // 빈 결과(200 + [])와 장애를 구분한다. 설정 실수·429·5xx 를 빈 콘텐츠로 위장하지 않는다.
  if (!response.ok)
    throw new Error(`Supabase ${label ?? collection} 읽기 실패 (${response.status})`);
  return (await response.json()) as Array<Record<string, unknown>>;
};

/**
 * 목록 조회를 페이지로 나눠 전량을 읽는다.
 *
 * 한 번에 읽으면 PostgREST 가 `max_rows` 에서 조용히 잘라, 공개 갤러리·sitemap·검색이
 * 뒷부분 콘텐츠를 잃는다. 서술자 정렬에 id 2차 키가 있어 페이지 경계가 고정된다.
 * 페이지마다 URL 이 달라 Data Cache 엔트리는 나뉘지만 태그가 같아 함께 무효화된다.
 */
const requestAllRows = (
  collection: TableCollectionId,
  params: URLSearchParams,
  cacheTag: string,
  options?: { fresh?: boolean; signal?: AbortSignal },
  label?: string,
): Promise<Array<Record<string, unknown>>> =>
  paginateAll(async (offset, size) => {
    const paged = new URLSearchParams(params);
    paged.set("limit", String(size));
    paged.set("offset", String(offset));
    return requestRows(collection, paged, cacheTag, options, label);
  });

/**
 * 컬렉션 행을 서술자 projection·정렬로 읽는다. published 게이트가 없는
 * 태그 사전·site 문서까지 다루는 범용 조회다.
 *
 * @returns 병합된 행 목록.
 */
const selectRows = async (
  collection: TableCollectionId,
  options?: SelectOptions,
): Promise<MergedRow[]> => {
  const { select, order } = descriptor(collection);
  const params = new URLSearchParams({ select, order: options?.order ?? order });
  for (const [column, expression] of Object.entries(options?.filters ?? {})) {
    params.set(column, expression);
  }
  const rows = await requestAllRows(collection, params, collectionCacheTag(collection), options);
  return rows.map((row) => mergeRow(collection, row));
};

/**
 * `published = true` 행만 서술자 정렬로 읽는다.
 *
 * @param [options] 공개 데이터 조회 옵션.
 * @returns 병합된 공개 행 목록.
 */
const selectPublished = async (
  collection: TableCollectionId,
  options?: { fresh?: boolean },
): Promise<MergedRow[]> => {
  if (!descriptor(collection).hasPublished)
    throw new Error(`published 게이트가 없는 컬렉션입니다: ${collection}`);
  return selectRows(collection, { ...options, filters: { published: "eq.true" } });
};

/**
 * published 행을 호출자 지정 projection 으로 읽는다.
 * `mergeRow` 는 data 와 서술자 스칼라만 알아서 별칭 필드를 버리므로, 여기서는
 * 행을 그대로 돌려주고 디코딩은 호출자가 한다. 본문 Markdown 처럼 무거운 jsonb
 * 필드를 전송에서 제외해야 하는 경로에 쓴다.
 *
 * @param select 별칭 포함 PostgREST projection. jsonb 경로는 JSON 키의
 *   대소문자를 그대로 써야 한다 (`data->relatedProjectIds`).
 * @returns projection 그대로의 행 목록.
 */
const selectProjectedPublished = async (
  collection: TableCollectionId,
  select: string,
  options?: { fresh?: boolean },
): Promise<Array<Record<string, unknown>>> => {
  const { order, hasPublished } = descriptor(collection);
  if (!hasPublished) throw new Error(`published 게이트가 없는 컬렉션입니다: ${collection}`);
  const params = new URLSearchParams({ select, order });
  params.set("published", "eq.true");
  return requestAllRows(collection, params, collectionCacheTag(collection), options);
};

/**
 * 문서 한 건을 읽는다. published 게이트 컬렉션은 공개 행만 조회한다.
 * 응답은 배열로 받아 빈 배열을 `null` 로 해석한다 — 단일 객체 Accept 의 406 의미에
 * 의존하지 않기 위해서다.
 *
 * @param label 오류 메시지에 표시할 문서 이름.
 * @returns 병합된 문서. 없으면 `null`.
 */
const fetchRow = async (
  collection: TableCollectionId,
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
 * @returns 병합된 문서. 없으면 `null`.
 */
const fetchRowAsUser = async (
  collection: TableCollectionId,
  documentId: string,
  accessToken: string,
): Promise<Record<string, unknown> | null> => {
  const { table, select } = descriptor(collection);
  const params = new URLSearchParams({ select });
  params.set("id", `eq.${documentId}`);
  const response = await restFetch({ path: table, params, accessToken, retry: true });
  if (!response.ok) throw new Error(`RAG 원본 조회 실패 (${response.status})`);
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const first = rows[0];
  return first ? mergeRow(collection, first).data : null;
};

export { fetchRow, fetchRowAsUser, selectProjectedPublished, selectPublished, selectRows };
