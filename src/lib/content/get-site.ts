import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { shouldUseMockContent } from "@/lib/content/content-source";
import { fetchSiteConfig } from "@/lib/firebase/firestore-rest";
import type { SiteConfig } from "@/types/site";

/**
 * site/config 문서. ★ Firestore REST(원칙 #6, read: if true).
 * mock 은 오직 개발 모드·env 미설정일 때만 — 그 시점에 동적 로드해
 * 실데이터 경로에서는 로드하지 않는다. 실데이터 모드에선 문서 없음(첫 저장 전)·
 * 문서 없음은 **빈 설정**, REST 오류는 ISR의 마지막 성공 결과를 지키기 위해 throw한다.
 */
const getSite = async (): Promise<SiteConfig> => {
  if (shouldUseMockContent()) return (await import("@/mocks/site")).MOCK_SITE;
  return (await fetchSiteConfig()) ?? EMPTY_SITE_CONFIG;
};

export { getSite };
