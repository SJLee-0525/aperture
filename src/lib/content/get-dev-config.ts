import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";
import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchDevConfig, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_DEV_CONFIG } from "@/mocks/dev";
import type { DevConfig } from "@/types/dev";

/**
 * site/dev 설정 문서(스택·인터뷰·경력 등). mock 은 오직 개발 모드·env 미설정일 때만.
 * 실데이터 모드에선 문서 없음·REST 오류 시 **빈 설정** — mock 문구 노출 방지(get-site 와 동일 정책).
 */
const getDevConfig = async (): Promise<DevConfig> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return MOCK_DEV_CONFIG;
  try {
    return (await fetchDevConfig()) ?? EMPTY_DEV_CONFIG;
  } catch (error) {
    console.warn("[content] getDevConfig: Firestore REST 실패 — 빈 설정", error);
    return EMPTY_DEV_CONFIG;
  }
};

export { getDevConfig };
