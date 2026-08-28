import type { Lang } from "@/types/lang";
import type { LocalizedText } from "@/types/localized";

/**
 * LocalizedText에서 현재 언어의 문자열을 꺼낸다.
 * 번역이 비어 있으면 en → ko 순으로 폴백 (영어를 다 안 채워도 화면이 깨지지 않음).
 */
const pickText = (text: LocalizedText, lang: Lang): string =>
  text[lang] || text.en || text.ko || "";

export { pickText };
