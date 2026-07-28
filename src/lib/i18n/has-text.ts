import type { LocalizedText } from "@/types/localized";

/** ko/en 중 하나라도 내용이 있으면 true — 빈 섹션 숨김·빈 항목 정리 공용. */
const hasText = (text: LocalizedText): boolean => Boolean(text.ko.trim() || text.en.trim());

export { hasText };
