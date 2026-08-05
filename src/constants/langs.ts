import type { Lang } from "@/types/lang";

/** 지원 언어 목록 — URL `[lang]` 세그먼트·localStorage 저장값 검증의 단일 출처 */
const LANGS: readonly Lang[] = ["ko", "en"];

/** 기본 언어 — 무-로케일 URL 리다이렉트 목적지·저장값 없음 폴백 공용 */
const DEFAULT_LANG: Lang = "ko";

/** 임의 문자열(URL 세그먼트·저장값)이 지원 언어인지 판별하는 타입 가드 */
const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

export { LANGS, DEFAULT_LANG, isLang };
