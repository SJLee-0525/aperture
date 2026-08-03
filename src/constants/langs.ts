import type { Lang } from "@/types/lang";

/** 지원 언어 목록 — localStorage 저장값 검증(LangProvider)의 단일 출처 */
const LANGS: readonly Lang[] = ["ko", "en"];

/** 기본 언어 — SSR 스냅샷·저장값 없음 폴백 공용 */
const DEFAULT_LANG: Lang = "ko";

export { LANGS, DEFAULT_LANG };
