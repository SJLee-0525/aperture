import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { COLLECTIONS, SITE_DOC } from "@/constants/collections";
import { db } from "@/lib/firebase/client";
import { MOCK_SITE } from "@/mocks/site";
import type { SiteConfig } from "@/types/site";

/**
 * 관리자 site/config 읽기. 문서가 없으면 기본값(mock)으로 부트스트랩 —
 * 첫 저장 시 이 내용이 Firestore 에 영속된다(태그 사전 + 이름·바이오·링크 시드).
 * 태그 사전·소개 CMS 가 공유하는 단일 문서다.
 */
const getSiteConfig = async (): Promise<SiteConfig> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE, SITE_DOC));
    if (!snap.exists()) return MOCK_SITE;
    const data = snap.data();
    return {
      name: data.name ?? MOCK_SITE.name,
      tagline: data.tagline ?? MOCK_SITE.tagline,
      landingLead: data.landingLead ?? MOCK_SITE.landingLead,
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
};

export { getSiteConfig, updateSiteConfig };
