"use client";

import { auth } from "@/lib/firebase/client";
import type { RagSyncSourceType } from "@/types/rag";

const requestRagSync = async (sourceType: RagSyncSourceType, sourceId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    const init = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: { sourceType, sourceId } }),
    };
    let response = await fetch("/api/admin/portfolio-embeddings", init);
    if (!response.ok && response.status >= 500) {
      response = await fetch("/api/admin/portfolio-embeddings", init);
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || `RAG 자동 갱신 실패 (${response.status})`);
    }
  } catch (error) {
    console.warn("콘텐츠는 저장됐지만 RAG 자동 갱신에 실패했습니다:", error);
  }
};

export { requestRagSync };
