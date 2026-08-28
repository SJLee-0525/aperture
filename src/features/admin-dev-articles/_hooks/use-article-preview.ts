"use client";

import { useEffect, useState } from "react";

import { adminIdToken } from "@/features/admin-dev-articles/_lib/admin-id-token";
import {
  previewArticleMarkdown,
  type ArticlePreviewResult,
} from "@/features/admin-dev-articles/_lib/preview-article-markdown";

/** 입력이 멈춘 뒤 미리보기를 다시 요청하기까지 기다리는 시간. 타자마다 서버를 부르지 않기 위한 값이다. */
const PREVIEW_DEBOUNCE_MS = 600;

type PreviewState = {
  result: ArticlePreviewResult | null;
  loading: boolean;
  error: string | null;
};

/**
 * 저장 전 본문의 서버 렌더 결과.
 *
 * 미리보기 탭이 열려 있을 때만 요청한다(07-dev-blog §5). 편집 중에 계속 부르면 색칠 비용을 그대로
 * 반복하게 되고, 보지도 않는 결과를 만드는 셈이 된다. 탭이 닫히면 마지막 결과는 그대로 두고
 * 요청만 멈춘다 — 다시 열었을 때 빈 화면부터 시작하지 않는다.
 *
 * @param {string} markdown 현재 본문.
 * @param {boolean} active 미리보기 탭이 열려 있는지.
 * @returns {PreviewState} 렌더 결과·진행 상태·실패 문구.
 */
const useArticlePreview = (markdown: string, active: boolean): PreviewState => {
  const [state, setState] = useState<PreviewState>({
    result: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!active) return;

    let alive = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    const timer = window.setTimeout(async () => {
      try {
        const idToken = await adminIdToken();
        const result = await previewArticleMarkdown(idToken, markdown);
        if (alive) setState({ result, loading: false, error: null });
      } catch (caught) {
        if (!alive) return;
        setState((previous) => ({
          ...previous,
          loading: false,
          error: (caught as Error).message || "미리보기를 만들지 못했습니다.",
        }));
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [markdown, active]);

  return state;
};

export { useArticlePreview };
