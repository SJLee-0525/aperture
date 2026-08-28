import { SUPABASE_COLLECTIONS, type TableCollectionId } from "@/constants/collections";

/** 병합이 끝난 행 — 컬렉션 디코더의 `(id, data)` 계약과 같은 모양이다. */
type MergedRow = { id: string; data: Record<string, unknown> };

/**
 * 행을 디코더 입력(camelCase 문서 모양)으로 병합한다.
 *
 * data 를 먼저 펼치고 스칼라 컬럼으로 덮는다. 마이그레이션 이전 데이터에 남은
 * `data.published`·`data.slug` 잔존값이 DB 스칼라를 이기지 못하게 하는 계약이다.
 *
 * 서술자만 참조하는 순수 함수라 공개 읽기(서버)와 관리자 쓰기(브라우저)가 함께 쓴다.
 * 전송 계층에 두면 그 모듈에 `server-only` 를 걸 수 없다.
 *
 * @param collection 논리 컬렉션 이름.
 * @param row PostgREST 또는 supabase-js 가 돌려준 행.
 * @returns 디코더에 넣을 `{ id, data }`.
 */
const mergeRow = (collection: TableCollectionId, row: Record<string, unknown>): MergedRow => {
  const { hasData, scalars } = SUPABASE_COLLECTIONS[collection];
  const raw = hasData ? (row.data as Record<string, unknown> | null) : null;
  const data: Record<string, unknown> = { ...(raw ?? {}) };
  for (const [domainKey, columnKey] of Object.entries(scalars)) data[domainKey] = row[columnKey];
  return { id: String(row.id), data };
};

export { mergeRow };
export type { MergedRow };
