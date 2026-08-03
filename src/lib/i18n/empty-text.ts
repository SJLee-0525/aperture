import type { LocalizedText } from "@/types/localized";

/** 빈 이중언어 값 — 폼 초기값·디코더 폴백 공용 단일 출처. 코드 전반이 불변 갱신이라 공유 참조 안전. */
const EMPTY_TEXT: LocalizedText = { ko: "", en: "" };

export { EMPTY_TEXT };
