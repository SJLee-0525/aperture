import { COLLECTIONS, SITE_DOC } from "@/constants/collections";

import { fetchDocument } from "@/lib/firebase/public/transport";
import { asText } from "@/lib/i18n/as-text";
import { sanitizePublicLinks } from "@/lib/security/public-url";

import type { SiteConfig } from "@/types/site";
import type { Tag } from "@/types/tag";

/**
 * REST API로 읽은 사이트 설정 필드를 공개 페이지 모델로 변환한다.
 *
 * @param {Record<string, unknown>} data 디코딩된 사이트 설정 필드.
 * @returns {SiteConfig} 다국어 문구, 링크와 태그가 정규화된 설정.
 */
const toSiteConfig = (data: Record<string, unknown>): SiteConfig => ({
  name: asText(data.name),
  tagline: asText(data.tagline),
  landingLead: asText(data.landingLead),
  contactLead: asText(data.contactLead),
  bio: asText(data.bio),
  links: sanitizePublicLinks(data.links, { allowMailto: true }),
  tags: (data.tags as Tag[]) ?? [],
});

/**
 * 공개 페이지에서 사용할 사이트 설정 문서를 읽는다.
 *
 * @param {{ fresh?: boolean }} [options] 공개 데이터 조회 옵션.
 * @param {boolean} [options.fresh] 캐시를 건너뛰고 최신 데이터를 읽을지 여부.
 * @returns {Promise<SiteConfig | null>} 사이트 설정. 문서가 없으면 `null`이다.
 */
const fetchSiteConfig = async (options?: { fresh?: boolean }): Promise<SiteConfig | null> => {
  const data = await fetchDocument(COLLECTIONS.SITE, SITE_DOC, "site", options);
  return data ? toSiteConfig(data) : null;
};

export { fetchSiteConfig, toSiteConfig };
