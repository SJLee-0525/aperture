/**
 * WebMCP 오리진 트라이얼 토큰 — Vercel 환경변수 `NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL_TOKEN` 이 단일 출처다.
 *
 * 비어 있으면 meta 태그를 아예 심지 않는다(루트 layout 이 null 렌더). 별도 기능 플래그는
 * 두지 않는다 — 토큰을 지우면 트라이얼이 꺼지고 API 가 사라지므로 이 값 하나가 킬 스위치다.
 * 로컬 검증은 토큰 없이 chrome://flags/#enable-webmcp-testing 활성화로 대체한다.
 * `NEXT_PUBLIC_` 값은 빌드 타임에 문자열로 인라인되므로 상수 취급이다.
 */
const WEBMCP_ORIGIN_TRIAL_TOKEN = process.env.NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL_TOKEN ?? "";

export { WEBMCP_ORIGIN_TRIAL_TOKEN };
