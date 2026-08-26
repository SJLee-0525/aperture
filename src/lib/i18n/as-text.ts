import type { LocalizedText } from "@/types/localized";

/**
 * unknown → LocalizedText 안전 디코더 — Supabase(클라 SDK·PostgREST) 응답 공용 단일 출처.
 * 필드 누락·타입 불일치는 빈 문자열로 채워 pickText/hasText가 undefined 없이 동작하게 한다.
 *
 * @param {unknown} v
 * @returns {LocalizedText}
 */
const asText = (v: unknown): LocalizedText => {
  const r = (v ?? {}) as Record<string, unknown>;
  return { ko: typeof r.ko === "string" ? r.ko : "", en: typeof r.en === "string" ? r.en : "" };
};

export { asText };
