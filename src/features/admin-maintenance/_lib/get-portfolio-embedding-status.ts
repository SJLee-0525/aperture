"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

type PortfolioEmbeddingStatus = {
  completed: number;
  model: string;
  outdated: number;
  pending: number;
  percent: number;
  stale: number;
  total: number;
};

const getPortfolioEmbeddingStatus = async (): Promise<PortfolioEmbeddingStatus> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("관리자 로그인이 필요합니다.");
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/portfolio-embeddings", {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    (PortfolioEmbeddingStatus & { error?: string }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error || `임베딩 상태 확인 실패 (${response.status})`);
  }
  return payload;
};

export { getPortfolioEmbeddingStatus };
export type { PortfolioEmbeddingStatus };
