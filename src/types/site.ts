import type { LocalizedText } from "@/types/localized";
import type { Tag } from "@/types/tag";

/** 소개 페이지 연락처 링크 — 관리자가 자유롭게 추가 */
type SiteLink = { label: string; href: string };

/** site/config 단일 문서 (전역 + 사진) */
type SiteConfig = {
  name: LocalizedText; // { ko: "이성준", en: "Sungjoon Lee" }
  tagline: LocalizedText; // 랜딩 eyebrow ("Photographer · Pianist · Developer")
  landingLead: LocalizedText; // 랜딩 서브 카피
  bio: LocalizedText; // 사진 섹션 소개
  links: SiteLink[];
  tags: Tag[]; // 태그 사전 (필터 칩·사진 태그의 단일 출처)
};

export type { SiteConfig, SiteLink };
