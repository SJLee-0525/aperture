/** localStorage 키 단일 출처 — 테마·언어 선택을 영속한다. */
const STORAGE_KEYS = {
  THEME: "ap-theme:v1",
  LANG: "ap-lang:v1",
  // v3: GA와 Sentry를 각각 선택할 수 있는 세분화 동의(ADR-0004).
  CONSENT: "ap-consent:v3",
} as const;

/** sessionStorage 키 단일 출처 — 탭 단위 일회성 전달에만 쓴다. */
const SESSION_STORAGE_KEYS = {
  // 챗봇 연락 초안 — 연락 페이지가 읽는 즉시 삭제한다(one-shot).
  CONTACT_DRAFT: "ap-contact-draft:v1",
} as const;

const LEGACY_STORAGE_KEYS = {
  THEME: "ap-theme",
  LANG: "ap-lang",
  // 수집 주체가 늘어난 동의는 승계하지 않는다 — 발견 즉시 삭제하고 배너를 다시 띄운다.
  ANALYTICS_CONSENT: "ap-analytics-consent:v1",
  COMBINED_CONSENT: "ap-consent:v2",
} as const;

export { LEGACY_STORAGE_KEYS, SESSION_STORAGE_KEYS, STORAGE_KEYS };
