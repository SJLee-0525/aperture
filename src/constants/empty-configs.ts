import type { DevConfig } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";
import type { MusicConfig } from "@/types/music";
import type { SiteConfig } from "@/types/site";

/**
 * config 단일 문서(site/config·music·dev)의 빈 기본값 — mock 과 달리 실서비스에 노출돼도 안전.
 * 실데이터 모드에서 문서가 없거나(첫 저장 전) REST 실패 시 공개 getter 가 이걸 반환하고,
 * 관리자 편집기도 같은 값으로 부트스트랩한다(mock 시드가 저장으로 영속되는 사고 방지).
 * mock 은 오직 개발 모드·env 미설정에서만 쓴다 — lib/content/content-source.ts 참조.
 */
const EMPTY_TEXT: LocalizedText = { ko: "", en: "" };

const EMPTY_SITE_CONFIG: SiteConfig = {
  name: EMPTY_TEXT,
  tagline: EMPTY_TEXT,
  landingLead: EMPTY_TEXT,
  contactLead: EMPTY_TEXT,
  bio: EMPTY_TEXT,
  links: [],
  tags: [],
};

const EMPTY_MUSIC_CONFIG: MusicConfig = {
  intro: EMPTY_TEXT,
  career: [],
  education: [],
};

const EMPTY_DEV_CONFIG: DevConfig = {
  heroLead: EMPTY_TEXT,
  interview: [],
  stack: [],
  timeline: [],
};

export { EMPTY_DEV_CONFIG, EMPTY_MUSIC_CONFIG, EMPTY_SITE_CONFIG };
