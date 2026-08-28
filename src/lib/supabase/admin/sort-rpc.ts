import { SUPABASE_COLLECTIONS } from "@/constants/collections";
import { getSupabaseClient } from "@/lib/supabase/client";

import type { SortableCollectionId } from "@/constants/collections";

type SortOrder = { id: string; order: number };

/**
 * 드래그 정렬 결과를 RPC 1회로 저장한다.
 *
 * RPC 는 RLS 거부·부재 문서를 오류 없이 제외하므로 반환된 갱신 행 수를 요청 수와
 * 대조해야 부분 반영을 실패로 잡을 수 있다. 중복 ID 는 행 수 대조를 무의미하게
 * 만들어 호출 전에 거른다.
 *
 * @param collection 수동 정렬을 갖는 컬렉션.
 * @param orders 바뀐 항목만 담은 정렬 목록. 비어 있으면 아무것도 하지 않는다.
 * @returns 전 항목이 반영되면 완료된다.
 */
const updateSortOrders = async (
  collection: SortableCollectionId,
  orders: SortOrder[],
): Promise<void> => {
  if (orders.length === 0) return;
  const rpc = SUPABASE_COLLECTIONS[collection].sortRpc;
  if (new Set(orders.map(({ id }) => id)).size !== orders.length) {
    throw new Error("중복된 정렬 대상이 있습니다.");
  }
  if (orders.some(({ order }) => !Number.isInteger(order))) {
    throw new Error("정렬 값이 올바르지 않습니다.");
  }

  const { data, error } = await getSupabaseClient().rpc(rpc, {
    items: orders.map(({ id, order }) => ({ id, sort_order: order })),
  });
  if (error || data !== orders.length) throw new Error("순서 저장에 실패했습니다.");
};

export { updateSortOrders };
export type { SortOrder };
