"use client";

import { useCallback, useEffect, useState } from "react";

import { generatePortfolioEmbeddings } from "@/features/admin-maintenance/_lib/generate-portfolio-embeddings";
import { getPortfolioEmbeddingStatus } from "@/features/admin-maintenance/_lib/get-portfolio-embedding-status";

/**
 * 관리자 진입 시 RAG 인덱스의 불필요(stale) 청크 잔류를 감지한다.
 * 비공개 전환·삭제 시의 자동 동기화(requestRagSync)는 브라우저 fire-and-forget 이라 실패할 수 있고,
 * 실패하면 챗봇이 비공개 콘텐츠를 계속 인용한다 — 그 잔류를 다음 관리자 방문에서 알리는 보완 장치.
 */
const useRagStaleAlert = () => {
  const [staleCount, setStaleCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPortfolioEmbeddingStatus()
      .then((status) => {
        if (active) setStaleCount(status.stale);
      })
      .catch(() => {
        // 감지는 best-effort — 상태 조회 실패는 배너 생략으로 조용히 처리(maintenance 페이지에서 확인 가능).
      });
    return () => {
      active = false;
    };
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await generatePortfolioEmbeddings();
      setStaleCount((await getPortfolioEmbeddingStatus()).stale);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSyncing(false);
    }
  }, []);

  const dismiss = useCallback(() => setDismissed(true), []);

  return {
    dismiss,
    error,
    staleCount,
    sync,
    syncing,
    visible: staleCount > 0 && !dismissed,
  };
};

export { useRagStaleAlert };
