import type { LocalizedText } from "@/types/localized";

/** 사이트 대표 제목·설명 — 루트 layout 기본값·랜딩 메타 공용 단일 출처 */
const SITE_NAME = "Sungjoon Lee";

/** 워드마크·태그라인이 영문인 브랜드와 일치 — 전 언어 공용 */
const SITE_TITLE = "Sungjoon Lee — Developer, Photographer, Pianist";

const SITE_DESCRIPTION: LocalizedText = {
  ko: "사진, 음악, 개발 작업을 소개하는 이성준(Sungjoon Lee)의 포트폴리오.",
  en: "The portfolio of Sungjoon Lee — photography, music, and software development.",
};

export { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE };
