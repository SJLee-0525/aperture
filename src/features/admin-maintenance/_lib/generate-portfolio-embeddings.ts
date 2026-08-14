"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

type PortfolioEmbeddingResult = {
  count: number;
  dimensions: number;
  model: string;
  sections: Record<string, number>;
};

const generatePortfolioEmbeddings = async (): Promise<PortfolioEmbeddingResult> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("관리자 로그인이 필요합니다.");
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/portfolio-embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const payload = (await response.json().catch(() => null)) as
    (PortfolioEmbeddingResult & { error?: string }) | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error || `포트폴리오 임베딩 생성 실패 (${response.status})`);
  }
  return payload;
};

export { generatePortfolioEmbeddings };
export type { PortfolioEmbeddingResult };
