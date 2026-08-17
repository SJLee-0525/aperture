"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  filterAdminArticles,
  type AdminArticleStatusFilter,
} from "@/features/admin-dev-articles/_lib/dev-article-filter";
import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import { sortAdminArticles } from "@/features/admin-dev-articles/_lib/dev-article-sort";

import type { AdminDevArticleListItem } from "@/types/admin";

type AdminArticlesStatus = "loading" | "ready" | "error";

/**
 * 관리자 블로그 목록 상태.
 *
 * 정렬 컬렉션이 쓰는 `useOrderedAdmin` 을 재사용하지 않는다. 블로그에는 드래그 순서가 없고
 * (`order` 필드 자체가 없다) 목록이 발행일로 정렬되기 때문이다. 대신 그쪽에서 검증된 두 가지를
 * 가져온다 — 상태머신(loading·ready·error)과, 실패하면 이전 값으로 되돌리는 낙관적 공개 토글.
 *
 * 정렬은 저장소가 아니라 여기서 한다. 초안은 `publishedAt` 이 없어 Firestore 쿼리로 자리를
 * 정할 수 없으므로 B5 이후에도 같은 순수 함수를 쓴다.
 *
 * 낙관적 갱신은 언제나 대상 행 하나만 건드린다. 여러 행의 요청이 겹칠 수 있어
 * 배열 전체를 복원하거나 재조회 결과로 갈아 끼우면 다른 행의 변경이 사라진다.
 *
 * @returns {{ articles: AdminDevArticleListItem[]; total: number; status: AdminArticlesStatus; error: string | null; keyword: string; setKeyword: (value: string) => void; statusFilter: AdminArticleStatusFilter; setStatusFilter: (value: AdminArticleStatusFilter) => void; togglePublished: (id: string, next: boolean) => Promise<void>; togglePinned: (id: string, next: boolean) => Promise<void>; pendingPinIds: ReadonlySet<string>; remove: (id: string) => Promise<void> }}
 *   `articles` 는 필터를 적용한 목록, `total` 은 필터 전 전체 글 수다.
 *   `pendingPinIds` 는 고정 요청이 진행 중인 행들이다.
 */
const useDevArticlesAdmin = () => {
  const repository = useMemo(() => getDevArticleRepository(), []);
  const [items, setItems] = useState<AdminDevArticleListItem[]>([]);
  const [status, setStatus] = useState<AdminArticlesStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminArticleStatusFilter>("all");
  /** 고정 요청이 끝나기 전 다시 누르지 못하게 잡아 두는 문서 ID. 행마다 독립이다. */
  const [pendingPinIds, setPendingPinIds] = useState<ReadonlySet<string>>(() => new Set());
  const itemsRef = useRef<AdminDevArticleListItem[]>([]);

  const replaceItems = useCallback((next: AdminDevArticleListItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  /**
   * 한 행만 바꾼다. 배열 전체를 갈아 끼우면 그 사이 다른 행에 반영한 낙관적 변경이 지워지고,
   * 방금 지운 행이 되살아난다.
   */
  const patchItem = useCallback(
    (id: string, patch: Partial<AdminDevArticleListItem>) => {
      replaceItems(itemsRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [replaceItems],
  );

  useEffect(() => {
    let alive = true;
    repository
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
  }, [repository]);

  const togglePublished = useCallback(
    async (id: string, next: boolean) => {
      setError(null);
      patchItem(id, { published: next });
      try {
        await repository.setPublished(id, next);
      } catch (caught) {
        patchItem(id, { published: !next });
        setError((caught as Error).message);
        return;
      }

      // 여기부터 저장은 끝났다. 재조회는 발행이 건드린 `publishedAt`·`firstPublishedAt` 로
      // 정렬 기준을 맞추는 일일 뿐이라, 실패해도 반영된 값을 되돌리지 않고 안내만 남긴다.
      try {
        // 응답은 요청을 보낸 시점의 상태다. 목록째 반영하면 그 사이 다른 행에 반영한
        // 낙관적 변경을 옛 값으로 되돌리므로 이 행만 가져온다.
        const fresh = new Map((await repository.list()).map((item) => [item.id, item]));
        const updated = fresh.get(id);
        // 저장소에서 사라진 행은 화면에서도 없앤다.
        replaceItems(
          itemsRef.current.flatMap((item) => (item.id !== id ? [item] : updated ? [updated] : [])),
        );
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [patchItem, repository, replaceItems],
  );

  const togglePinned = useCallback(
    async (id: string, next: boolean) => {
      setError(null);
      setPendingPinIds((current) => new Set(current).add(id));
      patchItem(id, { pinned: next });
      try {
        // 고정은 발행 시각을 건드리지 않아 정렬 기준이 그대로다. 목록을 다시 읽지 않는다.
        await repository.setPinned(id, next);
      } catch (caught) {
        patchItem(id, { pinned: !next });
        setError((caught as Error).message);
      } finally {
        setPendingPinIds((current) => {
          const rest = new Set(current);
          rest.delete(id);
          return rest;
        });
      }
    },
    [patchItem, repository],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const { imageCleanupWarning } = await repository.remove(id);
        replaceItems(itemsRef.current.filter((item) => item.id !== id));
        // 삭제는 끝났고 이미지 정리만 실패한 상태 — 행은 지우되 안내는 남긴다.
        if (imageCleanupWarning) setError(imageCleanupWarning);
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [repository, replaceItems],
  );

  const articles = useMemo(
    () => filterAdminArticles(sortAdminArticles(items), { status: statusFilter, keyword }),
    [items, statusFilter, keyword],
  );

  return {
    articles,
    total: items.length,
    status,
    error,
    keyword,
    setKeyword,
    statusFilter,
    setStatusFilter,
    togglePublished,
    togglePinned,
    pendingPinIds,
    remove,
  };
};

export { useDevArticlesAdmin };
