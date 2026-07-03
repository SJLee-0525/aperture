import type { LocalizedText } from "@/types/localized";

/** 경력·학력 타임라인 항목 — 기간 + 제목(직함·학교·소속). 음악 경력 페이지·개발 경력(Phase C) 공용. */
type TimelineEntry = { period: string; title: LocalizedText };

export type { TimelineEntry };
