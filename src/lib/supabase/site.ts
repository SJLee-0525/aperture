import { documentCacheTag } from "@/constants/cache";
import { COLLECTIONS, SITE_DOC, SUPABASE_COLLECTIONS } from "@/constants/collections";
import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";
import { toJson } from "@/lib/supabase/admin/row-codec";
import { getSupabaseClient } from "@/lib/supabase/client";

import type { SiteConfig } from "@/types/site";

const SITE_TABLE = SUPABASE_COLLECTIONS[COLLECTIONS.SITE]?.table ?? "site_documents";

/**
 * 관리자 site/config 읽기. 문서가 없으면(첫 저장 전) **빈 폼**으로 부트스트랩 —
 * mock 시드는 쓰지 않는다(그대로 저장하면 mock 문구가 실데이터로 영속되는 사고 방지,
 * music·dev 편집기와 동일 정책). 태그 사전·소개 CMS 가 공유하는 단일 문서다.
 *
 * @returns {Promise<SiteConfig>} 저장된 사이트 설정. 문서가 없으면 빈 설정이다.
 */
const getSiteConfig = async (): Promise<SiteConfig> => {
  const { data, error } = await getSupabaseClient()
    .from(SITE_TABLE)
    .select("data")
    .eq("id", SITE_DOC)
    .maybeSingle();
  if (error) throw new Error("사이트 설정을 불러오지 못했습니다.");
  if (!data) return EMPTY_SITE_CONFIG;
  const d = (data.data as Record<string, unknown> | null) ?? {};
  return {
    name: (d.name as SiteConfig["name"]) ?? EMPTY_SITE_CONFIG.name,
    tagline: (d.tagline as SiteConfig["tagline"]) ?? EMPTY_SITE_CONFIG.tagline,
    landingLead: (d.landingLead as SiteConfig["landingLead"]) ?? EMPTY_SITE_CONFIG.landingLead,
    contactLead: (d.contactLead as SiteConfig["contactLead"]) ?? EMPTY_SITE_CONFIG.contactLead,
    bio: (d.bio as SiteConfig["bio"]) ?? EMPTY_TEXT,
    links: (d.links as SiteConfig["links"]) ?? [],
    tags: (d.tags as SiteConfig["tags"]) ?? [],
  };
};

/**
 * 관리자 화면이 소유한 site/config 필드만 병합 저장한다.
 * 서로 다른 화면이 오래된 전체 snapshot으로 다른 화면의 최신 변경을 덮어쓰지 않도록
 * 병합은 `merge_site_document` RPC 가 DB 한 문장으로 수행한다 — read-modify-write 로
 * 바꾸면 그 경합이 되살아난다.
 *
 * @param {Partial<SiteConfig>} fields 현재 관리자 화면이 수정한 설정 필드.
 * @returns {Promise<void>} 병합 저장과 관련 RAG 동기화가 끝나면 완료된다.
 */
const updateSiteConfigFields = async (fields: Partial<SiteConfig>): Promise<void> => {
  const { data, error } = await getSupabaseClient().rpc("merge_site_document", {
    doc_id: SITE_DOC,
    patch: toJson(fields as Record<string, unknown>),
  });
  if (error || data !== 1) throw new Error("사이트 설정 저장에 실패했습니다.");
  requestPublicRevalidate(documentCacheTag(COLLECTIONS.SITE, SITE_DOC));
  await requestRagSync("siteConfig", SITE_DOC);
  if (fields.tags) await requestRagSync("photoTags", SITE_DOC);
};

export { getSiteConfig, updateSiteConfigFields };
