import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchDevConfig } from "@/lib/firebase/firestore-rest";
import type { DevConfig } from "@/types/dev";

/**
 * site/dev 설정 문서(스택·인터뷰·경력 등). mock 은 오직 개발 모드·env 미설정일 때만
 * — 그 시점에 동적 로드해 실데이터 경로에서는 로드하지 않는다.
 * 실데이터 모드에서 문서 없음은 빈 설정, REST 오류는 ISR 보존을 위해 throw한다.
 */
const getDevConfig = async (): Promise<DevConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/dev")).MOCK_DEV_CONFIG;
  return (await fetchDevConfig()) ?? EMPTY_DEV_CONFIG;
};

export { getDevConfig };
