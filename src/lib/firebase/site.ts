import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { COLLECTIONS, SITE_DOC } from "@/constants/collections";
import { firestoreDocumentCacheTag } from "@/constants/cache";
import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";

import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { getFirebaseDb } from "@/lib/firebase/client";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { SiteConfig } from "@/types/site";

/**
 * 관리자 site/config 읽기. 문서가 없으면(첫 저장 전) **빈 폼**으로 부트스트랩 —
 * mock 시드는 쓰지 않는다(그대로 저장하면 mock 문구가 실데이터로 영속되는 사고 방지,
 * music·dev 편집기와 동일 정책). 태그 사전·소개 CMS 가 공유하는 단일 문서다.
 *
 * @returns {Promise<SiteConfig>} 저장된 사이트 설정. 문서가 없으면 빈 설정이다.
 */
const getSiteConfig = async (): Promise<SiteConfig> => {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.SITE, SITE_DOC));
    if (!snap.exists()) return EMPTY_SITE_CONFIG;
    const data = snap.data();
    return {
      name: data.name ?? EMPTY_SITE_CONFIG.name,
      tagline: data.tagline ?? EMPTY_SITE_CONFIG.tagline,
      landingLead: data.landingLead ?? EMPTY_SITE_CONFIG.landingLead,
      contactLead: data.contactLead ?? EMPTY_SITE_CONFIG.contactLead,
      bio: data.bio ?? EMPTY_TEXT,
      links: data.links ?? [],
      tags: data.tags ?? [],
    };
  } catch {
    throw new Error("사이트 설정을 불러오지 못했습니다.");
  }
};

/**
 * 관리자 화면이 소유한 site/config 필드만 병합 저장한다.
 * 서로 다른 화면이 오래된 전체 snapshot으로 다른 화면의 최신 변경을 덮어쓰지 않도록
 * 전체 문서 교체는 이 seam 밖에 노출하지 않는다.
 *
 * @param {Partial<SiteConfig>} fields 현재 관리자 화면이 수정한 설정 필드.
 * @returns {Promise<void>} 병합 저장과 관련 RAG 동기화가 끝나면 완료된다.
 */
const updateSiteConfigFields = async (fields: Partial<SiteConfig>): Promise<void> => {
  try {
    await setDoc(
      doc(getFirebaseDb(), COLLECTIONS.SITE, SITE_DOC),
      {
        ...fields,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    throw new Error("사이트 설정 저장에 실패했습니다.");
  }
  requestPublicRevalidate(firestoreDocumentCacheTag(COLLECTIONS.SITE, SITE_DOC));
  await requestRagSync("siteConfig", SITE_DOC);
  if (fields.tags) await requestRagSync("photoTags", SITE_DOC);
};

export { getSiteConfig, updateSiteConfigFields };
