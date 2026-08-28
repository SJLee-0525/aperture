"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import { countTagUsage } from "@/features/admin-dev-articles/_lib/dev-article-tag-usage";

import type { DevArticleTag } from "@/types/dev-article-tag";

type ArticleTagsStatus = "loading" | "ready" | "error";

/**
 * 태그 관리 패널 상태 — 사전 목록과 태그별 사용 글 수를 함께 든다.
 *
 * 사용 글 수는 목록 projection(초안 포함)에서 센다. 삭제 버튼을 잠글 근거이자
 * 저장소 거부 문구와 같은 수치를 화면에 미리 보여 주는 값이다. 다만 검증의 최종
 * 방어선은 저장소(`removeTag`)다 — 이 훅의 수치는 화면 갱신 이전일 수 있다.
 *
 *   `createTag` 는 실패를 throw 해 추가 폼이 자리에서 보여 주고, `saveLabels`/`removeTag` 는
 *   실패를 `error` 로 남긴다. `saveLabels` 는 성공 여부를 돌려줘 행이 편집 상태를 정리하게 한다.
 */
const useArticleTagsAdmin = () => {
  const repository = useMemo(() => getDevArticleRepository(), []);
  const [tags, setTags] = useState<DevArticleTag[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<ArticleTagsStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [tagList, articles] = await Promise.all([repository.listTags(), repository.list()]);
    return { tagList, articles };
  }, [repository]);

  const apply = useCallback(
    ({ tagList, articles }: { tagList: DevArticleTag[]; articles: Array<{ tags: string[] }> }) => {
      setTags(tagList);
      setUsage(Object.fromEntries(tagList.map((tag) => [tag.id, countTagUsage(articles, tag.id)])));
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    fetchData()
      .then((data) => {
        if (!alive) return;
        apply(data);
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
  }, [fetchData, apply]);

  const reload = useCallback(async () => apply(await fetchData()), [fetchData, apply]);

  const createTag = useCallback(
    async (tag: DevArticleTag) => {
      await repository.createTag(tag);
      await reload();
    },
    [repository, reload],
  );

  const saveLabels = useCallback(
    async (tag: DevArticleTag): Promise<boolean> => {
      setError(null);
      try {
        await repository.updateTag(tag);
        await reload();
        return true;
      } catch (caught) {
        setError((caught as Error).message);
        return false;
      }
    },
    [repository, reload],
  );

  const removeTag = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await repository.removeTag(id);
        await reload();
      } catch (caught) {
        setError((caught as Error).message);
      }
    },
    [repository, reload],
  );

  return { tags, usage, status, error, createTag, saveLabels, removeTag };
};

export { useArticleTagsAdmin };
