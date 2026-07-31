import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";
import type { TimelineEntry } from "@/types/timeline";

/** 트러블슈팅 항목 — 제목 + 문제/해결(/결과) 구조. result 는 선택(없거나 빈 값이면 미표시). */
type DevTroubleshooting = {
  title: LocalizedText;
  problem: LocalizedText;
  solution: LocalizedText;
  result?: LocalizedText;
};

/** 프로젝트 (devProjects) — 상세는 모달(?project=). 필드 순서 = 모달 표시 순서. */
type DevProject = {
  id: string;
  title: LocalizedText;
  category: LocalizedText; // "SSAFY 관통 프로젝트" 등
  year: string; // "2025" — 카드 배지·crumb 용 (period 와 별도)
  period: LocalizedText; // "2025. 12. — 현재" / "Dec 2025 — Present"
  position: LocalizedText; // 담당 범위 + 팀 구성, 예: "Frontend 전체 · 6인 팀 (FE 1 · BE 2 · AI 3)"
  summary: LocalizedText; // 카드 한 줄 요약
  overview: LocalizedText;
  features: LocalizedText[]; // 주요 기능 — 제품이 하는 일 (roles 와 구분)
  roles: LocalizedText[]; // 담당·주요 작업 — 내가 한 일
  troubleshooting: DevTroubleshooting[];
  achievements: LocalizedText[]; // 성과·수상·지표 통합
  techTags: string[]; // 기술명 (언어 무관 평면)
  links: SiteLink[]; // GitHub / Live / 열기
  cover: ImageMeta | null; // 목록 카드 대표 이미지 (선택)
  images: ImageMeta[]; // 상세 모달 갤러리 (0장 이상)
  order: number;
  published: boolean;
};

/** 프로젝트 목록 Client Component에 전달하는 최소 카드 데이터. */
type DevProjectCardData = Pick<
  DevProject,
  "id" | "title" | "category" | "year" | "summary" | "cover"
>;

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

/** 개발 수상 항목 (site/dev.awards) — 음악 수상과 같은 목록 규격, 개발 설정 문서에 포함. */
type DevAward = {
  id: string;
  year: string;
  projectId: string;
  name: LocalizedText;
  place: LocalizedText;
  description: LocalizedText;
};

/** site/dev 설정 문서 — 소개 리드·인터뷰·스택·경력.
 *  (연락처·소셜은 /contact 로 일원화, 히어로 타이핑은 랜딩 소관 → dev config 에 두지 않음) */
type DevConfig = {
  heroLead: LocalizedText; // 소개 페이지 리드 문단
  interview: DevInterview[];
  stack: DevStackGroup[];
  education: TimelineEntry[];
  timeline: DevTimelineEntry[];
  awards: DevAward[];
};

export type {
  DevProject,
  DevProjectCardData,
  DevTroubleshooting,
  DevInterview,
  DevStackItem,
  DevStackGroup,
  DevTimelineEntry,
  DevAward,
  DevConfig,
};
