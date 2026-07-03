import type { LocalizedText } from "@/types/localized";
import type { Tag } from "@/types/tag";

/** 소개 페이지 연락처 링크 — 관리자가 자유롭게 추가 */
type SiteLink = { label: string; href: string };

/** site/config 단일 문서 (전역 + 사진) */
type SiteConfig = {
  name: LocalizedText; // { ko: "이성준", en: "Sungjoon Lee" }
  tagline: LocalizedText; // 랜딩 순환 타이핑 역할 ("Photographer · Pianist · Developer", '·' 로 분해)
  landingLead: LocalizedText; // 랜딩 서브 카피
  contactLead: LocalizedText; // 연락 페이지 리드 카피
  bio: LocalizedText; // 사진 섹션 소개
  links: SiteLink[]; // 연락 버튼 + mailto 폼 대상 (연락 페이지·헤더)
  tags: Tag[]; // 태그 사전 (필터 칩·사진 태그의 단일 출처)
};

export type { SiteConfig, SiteLink };
