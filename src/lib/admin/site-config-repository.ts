import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalDocRepository } from "@/lib/admin/mock/local-doc-repository";
import { selectRepository } from "@/lib/admin/select-repository";
import { getSiteConfig, updateSiteConfigFields } from "@/lib/supabase/site";

import type { SiteConfig } from "@/types/site";

/**
 * `site/config` 관리자 저장소 — 전역·연락·태그 사전·사진 소개가 나눠 쓰는 단일 문서라
 * 전체 저장 대신 **화면이 소유한 필드만 병합**하는 `updateFields` 만 노출한다. 오래된 전체
 * snapshot 으로 다른 화면의 최신 변경을 덮어쓰지 않게 하는 live 계약을 mock 도 따른다.
 */
type SiteConfigRepository = {
  get: () => Promise<SiteConfig>;
  updateFields: (fields: Partial<SiteConfig>) => Promise<void>;
};

/** 저장 형식 버전 — `SiteConfig` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 현재 콘텐츠 소스에 맞는 site/config 저장소. 첫 호출 결과를 재사용한다.
 *
 * @returns {SiteConfigRepository} mock 이면 브라우저 로컬, live 면 Supabase 구현.
 */
const getSiteConfigRepository = selectRepository<SiteConfigRepository>(
  () => {
    const doc = createLocalDocRepository<SiteConfig>({
      key: STORAGE_KEYS.ADMIN_SITE_CONFIG,
      version: STORE_VERSION,
      label: "사이트 설정",
      seed: async () => ({ ...(await import("@/mocks/site")).MOCK_SITE }),
      emptyDoc: EMPTY_SITE_CONFIG,
      getStorage: () => window.localStorage,
    });
    return { get: doc.get, updateFields: doc.merge };
  },
  () => ({ get: getSiteConfig, updateFields: updateSiteConfigFields }),
);

export { getSiteConfigRepository };
