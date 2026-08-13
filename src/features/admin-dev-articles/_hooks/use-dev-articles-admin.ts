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
 * @returns {{ articles: AdminDevArticleListItem[]; total: number; status: AdminArticlesStatus; error: string | null; keyword: string; setKeyword: (value: string) => void; statusFilter: AdminArticleStatusFilter; setStatusFilter: (value: AdminArticleStatusFilter) => void; togglePublished: (id: string, next: boolean) => Promise<void>; remove: (id: string) => Promise<void> }}
 *   `articles` 는 필터를 적용한 목록, `total` 은 필터 전 전체 글 수다.
 */
const useDevArticlesAdmin = () => {
  const repository = useMemo(() => getDevArticleRepository(), []);
  const [items, setItems] = useState<AdminDevArticleListItem[]>([]);
  const [status, setStatus] = useState<AdminArticlesStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminArticleStatusFilter>("all");
  const itemsRef = useRef<AdminDevArticleListItem[]>([]);

  const replaceItems = useCallback((next: AdminDevArticleListItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

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
      const previous = itemsRef.current;
      setError(null);
      replaceItems(previous.map((item) => (item.id === id ? { ...item, published: next } : item)));
      try {
        await repository.setPublished(id, next);
        // 발행이 `publishedAt`·`firstPublishedAt` 을 건드리므로 정렬 기준을 저장소에서 다시 읽는다.
        replaceItems(await repository.list());
      } catch (caught) {
        replaceItems(previous);
        setError((caught as Error).message);
      }
    },
    [repository, replaceItems],
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
    remove,
  };
};

export { useDevArticlesAdmin };
