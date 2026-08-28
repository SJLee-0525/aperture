"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useRef, useState } from "react";

type OrderedAdminItem = {
  id: string;
  order: number;
  published: boolean;
};

type OrderedAdminAdapter<T extends OrderedAdminItem> = {
  list: () => Promise<T[]>;
  updateOrder: (orders: Array<{ id: string; order: number }>) => Promise<void>;
  setPublished: (id: string, published: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

type OrderedAdminStatus = "loading" | "ready" | "error";

/**
 * 정렬형 관리자 목록의 공통 상태 머신.
 *
 * reorder는 한 번에 하나만 저장해 연속 drag의 stale snapshot 경쟁을 막고,
 * 일부 write가 실패하면 adapter에서 authoritative 목록을 다시 읽어 롤백한다.
 * 삭제의 도메인별 부작용은 adapter.remove 뒤에 숨긴다.
 */
const useOrderedAdmin = <T extends OrderedAdminItem>(adapter: OrderedAdminAdapter<T>) => {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<OrderedAdminStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<T[]>([]);
  const reorderPendingRef = useRef(false);
  // 저장이 끝나기 전에 다시 누르면 두 요청의 도착 순서가 화면과 어긋난다. 롤백 조건이
  // `item.published === next` 라 연타 중에는 되돌릴 대상을 찾지 못한다.
  const [publishPendingIds, setPublishPendingIds] = useState<ReadonlySet<string>>(new Set());
  const publishPendingRef = useRef<ReadonlySet<string>>(new Set());

  const replaceItems = useCallback((next: T[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const reload = useCallback(async () => {
    const loaded = await adapter.list();
    replaceItems(loaded);
    return loaded;
  }, [adapter, replaceItems]);

  useEffect(() => {
    let alive = true;
    adapter
      .list()
      .then((loaded) => {
        if (!alive) return;
        itemsRef.current = loaded;
        setItems(loaded);
        setStatus("ready");
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [adapter]);

  const reorder = useCallback(
    async (activeId: string, overId: string) => {
      if (activeId === overId || reorderPendingRef.current) return;

      const previous = itemsRef.current;
      const from = previous.findIndex((item) => item.id === activeId);
      const to = previous.findIndex((item) => item.id === overId);
      if (from < 0 || to < 0) return;

      const moved = arrayMove(previous, from, to).map((item, index) => ({
        ...item,
        order: index,
      }));
      const previousOrder = new Map(previous.map((item) => [item.id, item.order]));
      const changed = moved.filter((item) => previousOrder.get(item.id) !== item.order);

      reorderPendingRef.current = true;
      setError(null);
      replaceItems(moved);
      try {
        // 바뀐 항목이 없으면 저장을 건너뛴다. live 는 목록 전체가 아니라 이 목록만 RPC 1건으로 보낸다.
        if (changed.length > 0) {
          await adapter.updateOrder(changed.map(({ id, order }) => ({ id, order })));
        }
      } catch (caught) {
        setError((caught as Error).message);
        try {
          await reload();
        } catch {
          replaceItems(previous);
        }
      } finally {
        reorderPendingRef.current = false;
      }
    },
    [adapter, reload, replaceItems],
  );

  const togglePublished = useCallback(
    async (id: string, next: boolean) => {
      if (publishPendingRef.current.has(id)) return;
      publishPendingRef.current = new Set(publishPendingRef.current).add(id);
      setPublishPendingIds(publishPendingRef.current);
      const previous = itemsRef.current;
      const previousPublished = previous.find((item) => item.id === id)?.published;
      replaceItems(previous.map((item) => (item.id === id ? { ...item, published: next } : item)));
      try {
        await adapter.setPublished(id, next);
      } catch (caught) {
        if (previousPublished !== undefined) {
          replaceItems(
            itemsRef.current.map((item) =>
              item.id === id && item.published === next
                ? { ...item, published: previousPublished }
                : item,
            ),
          );
        }
        setError((caught as Error).message);
      } finally {
        const next = new Set(publishPendingRef.current);
        next.delete(id);
        publishPendingRef.current = next;
        setPublishPendingIds(next);
      }
    },
    [adapter, replaceItems],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await adapter.remove(id);
        replaceItems(itemsRef.current.filter((item) => item.id !== id));
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [adapter, replaceItems],
  );

  return { items, status, error, reorder, togglePublished, publishPendingIds, remove };
};

export { useOrderedAdmin };
