import { COLLECTIONS, SITE_DOC } from "@/constants/collections";
import { sanitizeSiteConfigForPublic } from "@/lib/supabase/decode/public-sanitize";
import { decodeSiteConfig } from "@/lib/supabase/decode/site";
import { fetchRow } from "@/lib/supabase/public/transport";

import type { SiteConfig } from "@/types/site";

/** 공개 사이트 설정. 저장된 연락 링크는 여기서만 표시용으로 정화한다(mailto 허용). */
const toSiteConfig = (data: Record<string, unknown>): SiteConfig =>
  sanitizeSiteConfigForPublic(decodeSiteConfig(data));

/**
 * 공개 페이지에서 사용할 사이트 설정 문서를 읽는다.
 *
 * @param [options] 공개 데이터 조회 옵션.
 * @returns 사이트 설정. 문서가 없으면 `null`이다.
 */
const fetchSiteConfig = async (options?: { fresh?: boolean }): Promise<SiteConfig | null> => {
  const data = await fetchRow(COLLECTIONS.SITE, SITE_DOC, "site", options);
  return data ? toSiteConfig(data) : null;
};

export { fetchSiteConfig, toSiteConfig };
