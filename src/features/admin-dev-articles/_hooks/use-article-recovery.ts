"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMounted } from "@/hooks/use-mounted";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

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
 * @returns {{ pending: { savedAt: number; input: DevArticleInput } | null; restore: () => DevArticleInput | null; discard: () => void; clear: () => void; abandon: () => void }}
 *   `pending` 은 아직 처리하지 않은 복구본, `restore` 는 그 값을 돌려주고 복구본을 지운다.
 *   `abandon` 은 편집을 버릴 때 쓰며 예약된 자동 저장까지 취소한다.
 */
const useArticleRecovery = (articleId: string, form: DevArticleInput, dirty: boolean) => {
  const mounted = useMounted();

  useUnsavedGuard(dirty);
  const [handled, setHandled] = useState(false);
  const timerRef = useRef<number | null>(null);
  // 편집을 버린 뒤에는 예약도 다시 잡지 않는다. `clear` 는 저장 성공 때도 불리므로
  // 그쪽 경로에서 자동 저장이 멈추지 않도록 종료 신호를 따로 둔다.
  const stoppedRef = useRef(false);

  const stored = useMemo(
    () => (mounted ? readArticleRecovery(window.localStorage, articleId) : null),
    [mounted, articleId],
  );

  useEffect(() => {
    if (!dirty || stoppedRef.current) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      writeArticleRecovery(window.localStorage, articleId, form);
    }, ARTICLE_RECOVERY_DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [articleId, dirty, form]);

  const clear = useCallback(() => {
    clearArticleRecovery(window.localStorage, articleId);
    setHandled(true);
  }, [articleId]);

  const restore = useCallback((): DevArticleInput | null => {
    if (!stored) return null;
    clear();
    return stored.input;
  }, [clear, stored]);

  /**
   * 편집을 버릴 때 부른다. 복구본을 지우고 예약된 저장도 취소해 다시 쓰이지 않게 한다.
   * 화면을 떠나기 전에 부르므로 언마운트 정리보다 먼저 예약을 끊는다.
   */
  const abandon = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    clear();
  }, [clear]);

  return { pending: handled ? null : stored, restore, discard: clear, clear, abandon };
};

export { useArticleRecovery };
