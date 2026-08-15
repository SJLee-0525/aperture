import { getSupabaseClient } from "@/lib/supabase/client";

import type { CollectionId } from "@/constants/collections";

/** 수동 정렬 테이블별 일괄 갱신 RPC. dev_articles 는 수동 정렬이 없어 대상이 아니다. */
const SORT_RPC: Partial<Record<CollectionId, string>> = {
  photos: "update_photos_sort_orders",
  albums: "update_albums_sort_orders",
  musicWorks: "update_music_works_sort_orders",
  musicAwards: "update_music_awards_sort_orders",
  musicMedia: "update_music_media_sort_orders",
  devProjects: "update_dev_projects_sort_orders",
};

type SortOrder = { id: string; order: number };

/**
 * 드래그 정렬 결과를 RPC 1회로 저장한다.
 *
 * RPC 는 RLS 거부·부재 문서를 오류 없이 제외하므로 반환된 갱신 행 수를 요청 수와
 * 대조해야 부분 반영을 실패로 잡을 수 있다. 중복 ID 는 행 수 대조를 무의미하게
 * 만들어 호출 전에 거른다.
 *
 * @param {SortOrder[]} orders 바뀐 항목만 담은 정렬 목록. 비어 있으면 아무것도 하지 않는다.
 * @returns {Promise<void>} 전 항목이 반영되면 완료된다.
 */
const updateSortOrders = async (collection: CollectionId, orders: SortOrder[]): Promise<void> => {
  if (orders.length === 0) return;
  const rpc = SORT_RPC[collection];
  if (!rpc) throw new Error(`정렬 RPC 가 없는 컬렉션입니다: ${collection}`);
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
