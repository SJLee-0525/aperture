/**
 * GA4 측정 ID (`G-XXXXXXXXXX`) — Vercel 환경변수 `NEXT_PUBLIC_GA_ID` 하나가 단일 출처다.
 *
 * 비어 있으면 스크립트를 아예 심지 않는다(아래 GoogleAnalytics 가 null 반환).
 * 로컬 `.env.local` 에는 넣지 않는 것이 기본 — 개발 중 새로고침이 실제 방문 통계를 오염시킨다.
 * `NEXT_PUBLIC_` 값은 빌드 타임에 문자열로 인라인되므로 런타임 조회가 아니라 상수 취급이다.
 */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export { GA_MEASUREMENT_ID };
