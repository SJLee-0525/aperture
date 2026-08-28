"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDevArticleRepository } from "@/features/admin-dev-articles/_lib/dev-article-repository";
import {
  loadDevProjectOptions,
  type DevProjectOption,
} from "@/features/admin-dev-articles/_lib/dev-project-options";

import type { AdminDevArticleListItem } from "@/types/admin";
import type { DevArticleTag } from "@/types/dev-article-tag";

/**
 * 편집 폼이 참고하는 주변 데이터 — 태그 사전, 프로젝트 선택지, 다른 글의 주소.
 *
 * 폼 값과 성격이 달라 따로 둔다. 이쪽은 읽기만 하고(태그 추가만 예외) 저장 흐름과 무관하며,
 * 발행 조건 검사가 "사전에 있는 태그인지 · 공개할 수 있는 프로젝트인지 · 주소가 겹치는지"를
 * 판단할 때 쓰는 값이다.
 *
 *   `addTag` 는 저장에 성공하면 사전 목록을 갱신하고, 실패하면 예외를 그대로 올려 호출부가 문구를 보여 준다.
 */
const useArticleReferences = () => {
  const repository = useMemo(() => getDevArticleRepository(), []);
  const [tags, setTags] = useState<DevArticleTag[]>([]);
  const [projects, setProjects] = useState<DevProjectOption[]>([]);
  const [articles, setArticles] = useState<AdminDevArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([repository.listTags(), loadDevProjectOptions(), repository.list()])
      .then(([loadedTags, loadedProjects, loadedArticles]) => {
        if (!alive) return;
        setTags(loadedTags);
        setProjects(loadedProjects);
        setArticles(loadedArticles);
        setLoading(false);
      })
      .catch((caught: Error) => {
        if (!alive) return;
        setError(caught.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [repository]);

  const addTag = useCallback(
    async (tag: DevArticleTag) => {
      await repository.createTag(tag);
      setTags(await repository.listTags());
    },
    [repository],
  );

  return { tags, projects, articles, loading, error, addTag };
};

export { useArticleReferences };
