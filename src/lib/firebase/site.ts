import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { COLLECTIONS, SITE_DOC } from "@/constants/collections";
import { EMPTY_SITE_CONFIG } from "@/constants/empty-configs";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { db } from "@/lib/firebase/client";
import type { SiteConfig } from "@/types/site";

/**
 * 관리자 site/config 읽기. 문서가 없으면(첫 저장 전) **빈 폼**으로 부트스트랩 —
 * mock 시드는 쓰지 않는다(그대로 저장하면 mock 문구가 실데이터로 영속되는 사고 방지,
 * music·dev 편집기와 동일 정책). 태그 사전·소개 CMS 가 공유하는 단일 문서다.
 */
const getSiteConfig = async (): Promise<SiteConfig> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE, SITE_DOC));
    if (!snap.exists()) return EMPTY_SITE_CONFIG;
    const data = snap.data();
    return {
      name: data.name ?? EMPTY_SITE_CONFIG.name,
      tagline: data.tagline ?? EMPTY_SITE_CONFIG.tagline,
      landingLead: data.landingLead ?? EMPTY_SITE_CONFIG.landingLead,
      contactLead: data.contactLead ?? EMPTY_SITE_CONFIG.contactLead,
      bio: data.bio ?? { ko: "", en: "" },
      links: data.links ?? [],
      tags: data.tags ?? [],
    };
  } catch {
    throw new Error("사이트 설정을 불러오지 못했습니다.");
  }
};

/**
 * site/config 전체 저장. 태그·소개 CMS 모두 "현재 전체 설정 로드 → 자기 부분 편집 → 전체 저장"
 * 흐름이라 부분 저장으로 인한 다른 필드 유실이 없다.
 */
const updateSiteConfig = async (config: SiteConfig): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.SITE, SITE_DOC), {
      ...config,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("사이트 설정 저장에 실패했습니다.");
  }
  requestPublicRevalidate();
};

export { getSiteConfig, updateSiteConfig };
