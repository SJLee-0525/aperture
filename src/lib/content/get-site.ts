import { mockContentEnabled } from "@/lib/content/content-source";
import { fetchSiteConfig, isFirebaseConfigured } from "@/lib/firebase/firestore-rest";
import { MOCK_SITE } from "@/mocks/site";
import type { SiteConfig } from "@/types/site";

/**
 * site/config 문서. ★ Firestore REST(원칙 #6, read: if true).
 * env 미설정·문서 없음(첫 배포 전)·REST 오류 시 mock 폴백 — 소개·태그 사전의 시드값이 된다.
 */
const getSite = async (): Promise<SiteConfig> => {
  if (mockContentEnabled() || !isFirebaseConfigured()) return MOCK_SITE;
  try {
    return (await fetchSiteConfig()) ?? MOCK_SITE;
  } catch (error) {
    console.warn("[content] getSite: Firestore REST 실패 — mock 폴백", error);
    return MOCK_SITE;
  }
};

export { getSite };
