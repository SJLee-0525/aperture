"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useMounted } from "@/hooks/use-mounted";

import {
  clearArticleRecovery,
  readArticleRecovery,
  writeArticleRecovery,
} from "@/features/admin-dev-articles/_lib/dev-article-recovery";

import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

/** 입력이 멈춘 뒤 복구본을 뜨기까지 기다리는 시간(계획 §5). 타자 중에 매번 쓰지 않기 위한 값이다. */
const ARTICLE_RECOVERY_DEBOUNCE_MS = 5_000;

/**
 * 편집 중 값을 잃지 않게 하는 로컬 복구본과 이탈 경고.
 *
 * 저장(`repository.update`)과는 다른 일을 한다. 저장은 관리자가 누를 때만 하고, 이쪽은 입력이
 * 5초 멈출 때마다 폼 값을 브라우저에 떠 둔다. 새로고침·탭 닫힘·브라우저 종료로 잃는 것을 막는
 * 것이 전부이고, 저장에 성공하면 지운다.
 *
 * 화면에 들어올 때 남아 있는 복구본은 자동으로 덮어쓰지 않고 알리기만 한다 — 저장본이 더 최신일
 * 수 있고, 어느 쪽을 쓸지는 관리자가 안다. 저장소는 서버 렌더에 없으므로 마운트 이후에 읽는다.
 *
 * @param {string} articleId 편집 중인 글의 문서 ID.
 * @param {DevArticleInput} form 현재 폼 값.
 * @param {boolean} dirty 저장 이후 바뀐 것이 있는지. false 면 뜨지도 경고하지도 않는다.
 * @returns {{ pending: { savedAt: number; input: DevArticleInput } | null; restore: () => DevArticleInput | null; discard: () => void; clear: () => void }}
 *   `pending` 은 아직 처리하지 않은 복구본, `restore` 는 그 값을 돌려주고 복구본을 지운다.
 */
const useArticleRecovery = (articleId: string, form: DevArticleInput, dirty: boolean) => {
  const mounted = useMounted();
  const [handled, setHandled] = useState(false);

  const stored = useMemo(
    () => (mounted ? readArticleRecovery(window.localStorage, articleId) : null),
    [mounted, articleId],
  );

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      writeArticleRecovery(window.localStorage, articleId, form);
    }, ARTICLE_RECOVERY_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [articleId, dirty, form]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // 최신 브라우저는 문구를 무시하고 자체 확인창을 띄운다. preventDefault 만이 조건이다.
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const clear = useCallback(() => {
    clearArticleRecovery(window.localStorage, articleId);
    setHandled(true);
  }, [articleId]);

  const restore = useCallback((): DevArticleInput | null => {
    if (!stored) return null;
    clear();
    return stored.input;
  }, [clear, stored]);

  return { pending: handled ? null : stored, restore, discard: clear, clear };
};

export { useArticleRecovery };
