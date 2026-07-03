import type { ImageMeta } from "@/types/image";
import type { LocalizedText } from "@/types/localized";
import type { SiteLink } from "@/types/site";

/** 연주 (musicWorks) — 포스터·프로그램·예매. 상세는 모달(?work=). */
type MusicWork = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText; // 작곡가·작품번호 ("Schubert · D.911")
  performedAt: Date; // 공연 일시 (Firestore Timestamp ↔ 래퍼가 변환)
  time: string; // "19:30"
  venue: LocalizedText;
  category: LocalizedText; // 리사이틀 / 협연 / 갈라
  program: string[]; // 곡명 (언어 무관 평면)
  description: LocalizedText;
  poster: ImageMeta; // 저장된 webp (EXIF 추출 없음)
  ticketUrl: string;
  order: number; // 수동 정렬 (dnd-kit)
  published: boolean;
};

/** 공연 예매 상태 */
type MusicScheduleStatus = "onSale" | "soon";

/** 공연 일정 (musicSchedule) */
type MusicSchedule = {
  id: string;
  title: LocalizedText;
  date: Date;
  venue: LocalizedText;
  status: MusicScheduleStatus;
  ticketUrl: string;
  order: number;
  published: boolean;
};

/** 수상 경력 (musicAwards) */
type MusicAward = {
  id: string;
  year: number;
  name: LocalizedText;
  place: string; // "Geneva, CH" (언어 무관)
  description: LocalizedText;
  order: number;
  published: boolean;
};

/** 영상 (musicMedia) — YouTube 임베드(파일 아님, ID 참조) */
type MusicMedia = {
  id: string;
  title: LocalizedText;
  source: LocalizedText; // "Live at 예술의전당 · 2025"
  youtubeId: string;
  order: number;
  published: boolean;
};

/** site/music 설정 문서 — 히어로·연락처 */
type MusicConfig = {
  heroLead: LocalizedText;
  typeWords: string[]; // 히어로 타이핑 순환 문구 (언어 무관 곡명)
  bookingEmail: string;
  social: SiteLink[];
};

export type {
  MusicWork,
  MusicScheduleStatus,
  MusicSchedule,
  MusicAward,
  MusicMedia,
  MusicConfig,
};
