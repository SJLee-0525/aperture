import type { Lang } from "@/types/lang";

/** 지원 언어 목록 — URL `[lang]` 세그먼트·localStorage 저장값 검증의 단일 출처 */
const LANGS: readonly Lang[] = ["ko", "en"];

/** 기본 언어 — 무-로케일 URL 리다이렉트 목적지·저장값 없음 폴백 공용 */
const DEFAULT_LANG: Lang = "ko";

/**
 * 임의 문자열(URL 세그먼트·저장값)이 지원 언어인지 판별하는 타입 가드
 */
const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

/**
 * `[lang]` 세그먼트를 지원 언어로 좁힌다. 지원 외 값은 기본 언어로 대체한다.
 *
 * 서버 렌더는 상위 `[lang]/layout.tsx` 의 `notFound()` 를 기다리지 않고 함께 실행되므로,
 * 세그먼트로 `DICTIONARY` 를 인덱싱하는 자리는 "/fr/dev" 같은 요청에서도 던지지 않아야 한다.
 * 던지면 응답이 404 가 아니라 500 이 된다.
 *
 * @param value URL 에서 온 검증 전 세그먼트.
 */
const toLang = (value: string): Lang => (isLang(value) ? value : DEFAULT_LANG);

export { LANGS, DEFAULT_LANG, isLang, toLang };
