import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchSiteConfig, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_SITE } from "@/mocks/site";
import type { SiteConfig } from "@/types/site";

/**
 * site/config 문서. ★ Firestore REST(원칙 #6, read: if true).
 * mock 은 오직 개발 모드·env 미설정일 때만. 실데이터 모드에선 문서 없음(첫 저장 전)·
 * REST 오류 시 **빈 설정** — mock 문구가 실서비스에 노출되지 않는다(리스트 getter 와 동일 정책).
 */
const getSite = async (): Promise<SiteConfig> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return MOCK_SITE;
  try {
    return (await fetchSiteConfig()) ?? EMPTY_SITE_CONFIG;
  } catch (error) {
    console.warn("[content] getSite: Firestore REST 실패 — 빈 설정", error);
    return EMPTY_SITE_CONFIG;
  }
};

export { getSite };
