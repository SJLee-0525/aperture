import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

/** 프로젝트 (devProjects) — 상세는 모달(?project=). */
type DevProject = {
  id: string;
  title: LocalizedText;
  category: LocalizedText; // "SSAFY 관통 프로젝트" 등
  year: string; // "2025"
  summary: LocalizedText; // 카드 한 줄 요약
  overview: LocalizedText;
  roles: LocalizedText[]; // 담당·주요 작업
  troubleshooting: LocalizedText[];
  techTags: string[]; // 기술명 (언어 무관 평면)
  links: SiteLink[]; // GitHub / Live / 열기
  cover: ImageMeta | null; // 목록 카드 대표 이미지 (선택)
  images: ImageMeta[]; // 상세 모달 갤러리 (0장 이상)
  order: number;
  published: boolean;
};

/** 소개 인터뷰 Q&A (site/dev.interview) */
type DevInterview = { q: LocalizedText; a: LocalizedText };

/** 기술 스택 항목 — 이름 + 배경/글자색(기술별 브랜드 색, 관리자 편집). 색은 hex 데이터. */
type DevStackItem = { name: string; bg: string; fg: string };

/** 기술 스택 그룹 (site/dev.stack) */
type DevStackGroup = { category: string; items: DevStackItem[] };

/** 경력 타임라인 항목 (site/dev.timeline) */
type DevTimelineEntry = {
  period: string; // "2025 — 현재"
  title: LocalizedText;
  role: LocalizedText;
  desc: LocalizedText;
};

/** site/dev 설정 문서 — 히어로·인터뷰·스택·경력·연락처 */
type DevConfig = {
  heroLead: LocalizedText;
  typeWords: string[]; // 히어로 타이핑 순환 문구 (언어 무관)
  interview: DevInterview[];
  stack: DevStackGroup[];
  timeline: DevTimelineEntry[];
  githubUrl: string;
  resumeUrl: string;
  contactEmail: string;
  social: SiteLink[];
};

export type { DevProject, DevInterview, DevStackItem, DevStackGroup, DevTimelineEntry, DevConfig };
