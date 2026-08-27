import { collectionCacheTag, documentCacheTag } from "@/constants/cache";
import { SUPABASE_COLLECTIONS } from "@/constants/collections";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { requireAdminSession } from "@/lib/supabase/admin/require-admin-session";
import { rowEncoderFor, toJson } from "@/lib/supabase/admin/row-codec";
import { updateSortOrders, type SortOrder } from "@/lib/supabase/admin/sort-rpc";
import { getSupabaseClient } from "@/lib/supabase/client";
import { paginateAll } from "@/lib/supabase/paginate-all";
import { mergeRow } from "@/lib/supabase/row-merge";

import type { SortableCollectionId, TableCollectionId } from "@/constants/collections";
import type { RagSyncSourceType } from "@/types/rag";

type WithId = { id: string };

/**
 * 쓰기 후 RAG 동기화 여부를 정하는 정책.
 *
 * 정책은 작업 이름 대신 쓰기 전후 문서 상태로 판단한다.
 * `before` 는 쓰기 직전 스냅샷(생성이면 `null`), `after` 는 쓰기 결과(삭제면 `null`)다.
 *
 * `"remove"`도 `requestRagSync`를 호출한다. embeddings route 가 원본을 다시 읽어
 * 비공개 또는 삭제된 문서의 청크를 비운다.
 */
type PostSyncPolicy<T> = (before: T | null, after: T | null) => "sync" | "remove" | "skip";

type QueryError = { message: string } | null;

/** supabase-js 는 실패를 던지지 않고 `{ error }` 로 돌려준다. 놓치면 실패가 성공으로 위장된다. */
const assertNoError = (error: QueryError, message: string): void => {
  if (error) throw new Error(message);
};

/**
 * 문서 단위 관리자 CRUD 팩토리 (Supabase).
 *
 * 목록 조회와 드래그 정렬은 여기 없다. 그 둘은 수동 정렬을 갖는 컬렉션만의 연산이라
 * `sortableListCrud` 가 얹는다. 팩토리 하나가 전부 노출하면 `devArticles` 처럼 정렬이
 * 없는 컬렉션에도 `updateOrder` 가 붙어 호출 시 런타임에만 실패한다.
 *
 * 인코딩은 `rowEncoderFor` 가, 읽기 병합은 `row-merge` 의 `mergeRow` 가 맡아
 * 쓰기와 읽기가 같은 왕복 계약을 쓴다. 정렬·projection 은 `SUPABASE_COLLECTIONS`
 * 서술자가 단일 출처다. `created_at`/`updated_at` 은 DB 기본값·트리거 소유라 쓰지 않는다.
 *
 * @param {CollectionId} collection 대상 논리 컬렉션 이름.
 * @param {(id: string, d: Record<string, unknown>) => T} toEntity 병합된 행을 도메인 모델로 바꾸는 함수.
 * @param {string} label 오류 메시지에 표시할 항목 이름.
 * @param {RagSyncSourceType} [ragSourceType] 변경 후 동기화할 RAG 소스 종류. 없으면 동기화 요청이 없다.
 * @param {PostSyncPolicy<T>} [syncPolicy] 쓰기 전후 상태로 동기화 여부를 정하는 정책. 없으면 모든 쓰기가 동기화를 요청하고 쓰기 직전 스냅샷도 읽지 않는다.
 * @returns 해당 컬렉션에 묶인 문서 단위 CRUD 함수.
 */
const documentCrud = <T extends WithId>(
  collection: TableCollectionId,
  toEntity: (id: string, d: Record<string, unknown>) => T,
  label: string,
  ragSourceType?: RagSyncSourceType,
  syncPolicy?: PostSyncPolicy<T>,
) => {
  type Input = Omit<T, "id">;
  /** 쓰기 직전 스냅샷과 조회 성공 여부. 실패와 "문서 없음"을 구분해야 fallback 이 성립한다. */
  type BeforeSnapshot = { before: T | null; failed: boolean };

  const { table, select } = SUPABASE_COLLECTIONS[collection];
  const encode = rowEncoderFor(collection);
  const cacheTag = collectionCacheTag(collection);
  /**
   * 컬렉션 태그만 지우면 `fetchRow` 가 붙인 단건 태그가 남는다. 그 태그를 지우는 쓰기가
   * 없으면 단건 조회가 재검증 주기까지 stale 값을 돌려준다.
   */
  const tagsFor = (id: string): [string, string] => [cacheTag, documentCacheTag(collection, id)];
  const from = () => getSupabaseClient().from(table);

  const fetchEntity = async (id: string): Promise<T | null> => {
    const { data, error } = await from().select(select).eq("id", id).maybeSingle();
    if (error) throw new Error(`${label}을(를) 불러오지 못했습니다.`);
    return data
      ? toEntity(id, mergeRow(collection, data as unknown as Record<string, unknown>).data)
      : null;
  };

  /**
   * 정책 판단에 사용할 쓰기 직전 스냅샷. 정책이 없으면 읽지 않는다.
   * 조회 실패는 `failed` 로 표시하고 쓰기를 막지 않는다.
   */
  const readBeforeWrite = async (id: string): Promise<BeforeSnapshot | null> => {
    if (!(ragSourceType && syncPolicy)) return null;
    try {
      return { before: await fetchEntity(id), failed: false };
    } catch {
      return { before: null, failed: true };
    }
  };

  /**
   * 쓰기 성공 뒤 RAG 동기화를 요청한다. `ragSourceType` 이 없으면 아무것도 하지 않는다.
   * 스냅샷 조회가 실패하면 청크가 남지 않도록 동기화를 요청한다.
   */
  const syncAfterWrite = async (
    id: string,
    snapshot: BeforeSnapshot | null,
    after: T | null,
  ): Promise<void> => {
    if (!ragSourceType) return;
    const decision =
      !syncPolicy || !snapshot || snapshot.failed ? "sync" : syncPolicy(snapshot.before, after);
    if (decision === "skip") return;
    await requestRagSync(ragSourceType, id);
  };

  return {
    /** 새 문서 ID를 미리 발급한다. Storage 경로를 먼저 정할 때 사용한다. */
    newId: (): string => crypto.randomUUID(),
    /**
     * 관리자 편집용 문서 한 건을 읽는다.
     *
     * @param {string} id 조회할 문서 ID.
     * @returns {Promise<T | null>} 변환된 모델. 문서가 없으면 `null`이다.
     */
    get: async (id: string): Promise<T | null> => {
      await requireAdminSession();
      return fetchEntity(id);
    },
    /**
     * 미리 발급한 ID로 문서를 생성한다.
     *
     * @param {string} id 새 문서에 사용할 ID.
     * @param {Input} input 문서 ID를 제외한 저장 필드.
     * @returns {Promise<void>} 저장과 후속 갱신이 끝나면 완료된다.
     */
    create: async (id: string, input: Input): Promise<void> => {
      const { error } = await from().insert(encode(id, input));
      assertNoError(error, `${label} 저장에 실패했습니다.`);
      requestPublicRevalidate(...tagsFor(id));
      // 생성 전 상태는 문서 없음으로 처리한다.
      await syncAfterWrite(id, { before: null, failed: false }, { id, ...input } as T);
    },
    /**
     * 기존 문서의 도메인 필드를 수정한다.
     * RLS 거부·부재 문서는 오류 없이 0행이 되므로 반환 행으로 반영을 검증한다.
     *
     * @param {string} id 수정할 문서 ID.
     * @param {Input} input 교체할 도메인 필드.
     * @returns {Promise<void>} 수정과 후속 갱신이 끝나면 완료된다.
     */
    update: async (id: string, input: Input): Promise<void> => {
      const snapshot = await readBeforeWrite(id);
      const { data, error } = await from().update(encode(id, input)).eq("id", id).select("id");
      if (error || !data?.length) throw new Error(`${label} 수정에 실패했습니다.`);
      requestPublicRevalidate(...tagsFor(id));
      await syncAfterWrite(id, snapshot, { id, ...input } as T);
    },
    /**
     * 일부 필드만 갱신한다. 저장된 data jsonb 를 그대로 읽어 병합하므로 디코더를 거치지 않는다.
     *
     * 전체 문서를 되쓰는 경로는 디코더가 결측 필드에 채운 폴백까지 함께 저장한다.
     * 이미지 파생본 마이그레이션처럼 한 필드만 바꾸는 작업이 공연일·촬영일을 덮어쓰는
     * 것을 막는다. 이 함수가 모르는 필드도 원본 그대로 남는다.
     *
     * @param {string} id 수정할 문서 ID.
     * @param {Partial<Input>} patch 덮어쓸 도메인 필드.
     * @returns {Promise<void>} 수정과 후속 갱신이 끝나면 완료된다.
     */
    patchData: async (id: string, patch: Partial<Input>): Promise<void> => {
      const { data: row, error: readError } = await from()
        .select("data")
        .eq("id", id)
        .maybeSingle();
      if (readError || !row) throw new Error(`${label} 수정에 실패했습니다.`);
      const current = (row as { data: Record<string, unknown> | null }).data ?? {};
      const next = { ...current, ...toJson(patch as Record<string, unknown>) };
      const { data, error } = await from().update({ data: next }).eq("id", id).select("id");
      if (error || !data?.length) throw new Error(`${label} 수정에 실패했습니다.`);
      requestPublicRevalidate(...tagsFor(id));
      // 병합 결과를 도메인 모델로 되돌리지 않으므로 정책에 넘길 전후 상태가 없다.
      // 스냅샷 없음은 강제 동기화로 처리된다.
      await syncAfterWrite(id, null, null);
    },
    /**
     * 문서의 공개 상태를 변경한다.
     *
     * @param {string} id 상태를 바꿀 문서 ID.
     * @param {boolean} published 공개 여부.
     * @returns {Promise<void>} 상태 저장과 후속 갱신이 끝나면 완료된다.
     */
    setPublished: async (id: string, published: boolean): Promise<void> => {
      const snapshot = await readBeforeWrite(id);
      const { data, error } = await from().update({ published }).eq("id", id).select("id");
      if (error || !data?.length) throw new Error("공개 상태 변경에 실패했습니다.");
      requestPublicRevalidate(...tagsFor(id));
      // 이전 스냅샷의 published 값만 바꿔 정책에 전달한다. 스냅샷이 없으면
      // syncAfterWrite 가 정책을 묻지 않으므로 after 는 쓰이지 않는다.
      const after = snapshot?.before ? ({ ...snapshot.before, published } as T) : null;
      await syncAfterWrite(id, snapshot, after);
    },
    /**
     * 문서를 삭제하고 공개 캐시와 RAG 문서를 갱신한다.
     * DELETE 는 RLS 가 행을 감추면 오류 없이 0행이 되므로 반환 행으로 검증한다.
     * 이미 없는 문서의 삭제도 실패다 — CMS 삭제 대상은 방금 목록에 뜬 문서라서,
     * 0행은 부재가 아니라 세션 만료가 원인일 가능성이 높다.
     *
     * @param {string} id 삭제할 문서 ID.
     * @returns {Promise<void>} 삭제와 후속 갱신이 끝나면 완료된다.
     */
    remove: async (id: string): Promise<void> => {
      const snapshot = await readBeforeWrite(id);
      const { data, error } = await from().delete().eq("id", id).select("id");
      if (error || !data?.length) throw new Error(`${label} 삭제에 실패했습니다.`);
      requestPublicRevalidate(...tagsFor(id));
      await syncAfterWrite(id, snapshot, null);
    },
  };
};

/**
 * 수동 정렬을 갖는 컬렉션의 관리자 CRUD 팩토리.
 *
 * `documentCrud` 에 관리자 목록 조회와 드래그 정렬을 더한다. 인자 타입이
 * `SortableCollectionId` 라 정렬 RPC 가 없는 컬렉션은 여기 들어올 수 없다.
 *
 * @param {SortableCollectionId} collection 대상 논리 컬렉션 이름.
 * @param {(id: string, d: Record<string, unknown>) => T} toEntity 병합된 행을 도메인 모델로 바꾸는 함수.
 * @param {string} label 오류 메시지에 표시할 항목 이름.
 * @param {RagSyncSourceType} [ragSourceType] 변경 후 동기화할 RAG 소스 종류.
 * @param {PostSyncPolicy<T>} [syncPolicy] 쓰기 전후 상태로 동기화 여부를 정하는 정책.
 * @returns 문서 CRUD 에 `list`·`updateOrder` 를 더한 함수 묶음.
 */
const sortableListCrud = <T extends WithId>(
  collection: SortableCollectionId,
  toEntity: (id: string, d: Record<string, unknown>) => T,
  label: string,
  ragSourceType?: RagSyncSourceType,
  syncPolicy?: PostSyncPolicy<T>,
) => {
  const { table, select, order } = SUPABASE_COLLECTIONS[collection];
  const cacheTag = collectionCacheTag(collection);
  const from = () => getSupabaseClient().from(table);

  return {
    ...documentCrud<T>(collection, toEntity, label, ragSourceType, syncPolicy),
    /**
     * 초안을 포함한 전체 관리자 목록을 서술자 정렬 순으로 읽는다.
     * 세션이 없으면 RLS 가 초안을 오류 없이 감추므로 먼저 로그인 오류로 바꾼다.
     */
    list: async (): Promise<T[]> => {
      await requireAdminSession();
      // 페이지네이션이 없으면 PostgREST 가 max_rows 에서 조용히 잘라, 뒷부분 항목이 화면에서
      // 사라진 채 재정렬이 그 상태를 저장한다. 서술자 order 의 id 2차 키가 경계를 고정한다.
      const rows = await paginateAll<Record<string, unknown>>(async (offset, size) => {
        let query = from().select(select);
        for (const part of order.split(",")) {
          const [column, direction, nulls] = part.split(".");
          query = query.order(column, {
            ascending: direction !== "desc",
            ...(nulls ? { nullsFirst: nulls === "nullsfirst" } : {}),
          });
        }
        const { data, error } = await query.range(offset, offset + size - 1);
        if (error) throw new Error(`${label} 목록을 불러오지 못했습니다.`);
        return (data ?? []) as unknown as Array<Record<string, unknown>>;
      });
      return rows.map((row) => {
        const merged = mergeRow(collection, row);
        return toEntity(merged.id, merged.data);
      });
    },
    /**
     * 드래그 정렬 결과를 RPC 1회로 저장한다. 정렬은 검색 본문과 무관해 RAG 동기화가 없다.
     *
     * @param {SortOrder[]} orders 바뀐 항목만 담은 정렬 목록.
     * @returns {Promise<void>} 순서 저장이 끝나면 완료된다.
     */
    updateOrder: async (orders: SortOrder[]): Promise<void> => {
      if (orders.length === 0) return;
      await updateSortOrders(collection, orders);
      requestPublicRevalidate(cacheTag);
    },
  };
};

export { documentCrud, sortableListCrud };
export type { PostSyncPolicy };
