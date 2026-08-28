/**
 * 사이트 섹션 식별자 — `html[data-section]` 액센트 및 네비 그룹의 단일 출처.
 * 액센트 "색"은 globals.css 의 `html[data-section]` 규칙(디자인 site.css 이식)이 담당한다 — 여기엔 색을 두지 않는다.
 */
type SectionId = "home" | "photo" | "music" | "dev" | "contact" | "legal";

/** pathname 접두사 → 섹션. 위에서부터 첫 매치(정확히 일치 또는 하위 경로). */
const SECTION_BY_PREFIX: { prefix: string; section: SectionId }[] = [
  { prefix: "/photo", section: "photo" },
  { prefix: "/music", section: "music" },
  { prefix: "/dev", section: "dev" },
  { prefix: "/contact", section: "contact" }, // 전역 페이지지만 자체 액센트(주황) 부여
  { prefix: "/privacy", section: "legal" },
  { prefix: "/terms", section: "legal" },
  { prefix: "/accessibility", section: "legal" },
];

/** 랜딩(`/`) 및 매칭 실패 시 기본 섹션 */
const DEFAULT_SECTION: SectionId = "home";

export { DEFAULT_SECTION, SECTION_BY_PREFIX };
export type { SectionId };
