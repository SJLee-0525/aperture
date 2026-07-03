import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchDevConfig, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_DEV_CONFIG } from "@/mocks/dev";
import type { DevConfig } from "@/types/dev";

/**
 * site/dev 설정 문서(스택·인터뷰·경력 등). 문서가 없으면(첫 배포 전) mock 시드로 폴백 —
 * get-music-config 와 동일 패턴(단일 config 문서라 mock 시드 허용).
 */
const getDevConfig = async (): Promise<DevConfig> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return MOCK_DEV_CONFIG;
  try {
    return (await fetchDevConfig()) ?? MOCK_DEV_CONFIG;
  } catch (error) {
    console.warn("[content] getDevConfig: Firestore REST 실패 — mock 폴백", error);
    return MOCK_DEV_CONFIG;
  }
};

export { getDevConfig };
