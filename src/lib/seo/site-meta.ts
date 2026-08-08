import type { LocalizedText } from "@/types/localized";

/** 사이트 대표 제목·설명 — 루트 layout 기본값·랜딩 메타 공용 단일 출처 */
const SITE_NAME = "Sungjoon Lee";

/** 브라우저 탭과 공유 카드에 사용하는 간결한 사이트 대표 제목 */
const SITE_TITLE = "Sungjoon Lee — Portfolio";

const SITE_DESCRIPTION: LocalizedText = {
  ko: "사진, 음악, 개발 작업을 소개하는 이성준(Sungjoon Lee)의 포트폴리오.",
  en: "The portfolio of Sungjoon Lee — photography, music, and software development.",
};

const SITE_IMAGE_PATH = "/opengraph-image";
const SITE_IMAGE_ALT = "Sungjoon Lee — Developer, Photographer, Pianist";
const SITE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export {
  SITE_DESCRIPTION,
  SITE_IMAGE_ALT,
  SITE_IMAGE_PATH,
  SITE_IMAGE_SIZE,
  SITE_NAME,
  SITE_TITLE,
};
