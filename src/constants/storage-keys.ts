/** localStorage 키 단일 출처 — 테마·언어 선택과 관리자 로컬 작업본을 영속한다. */
const STORAGE_KEYS = {
  THEME: "ap-theme:v1",
  LANG: "ap-lang:v1",
  // v3: GA와 Sentry를 각각 선택할 수 있는 세분화 동의(ADR-0004).
  CONSENT: "ap-consent:v3",
  // mock 단계의 블로그 글 저장소. Firestore를 대신하며 B5에서 쓰지 않게 된다.
  ADMIN_DEV_ARTICLES: "ap-admin-dev-articles:v1",
} as const;

/** 글마다 하나씩 두는 편집 중 복구본의 키 접두사. 저장에 성공하면 지운다. */
const ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX = "ap-admin-dev-article-draft:v1:";

/**
 * 편집 중인 글 하나의 복구본 키.
 *
 * @param {string} articleId 편집 중인 글의 문서 ID.
 * @returns {string} 해당 글 전용 localStorage 키.
 */
const adminDevArticleDraftKey = (articleId: string): string =>
  `${ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX}${articleId}`;

/** sessionStorage 키 단일 출처 — 탭 단위 일회성 전달에만 쓴다. */
const SESSION_STORAGE_KEYS = {
  // 챗봇 연락 초안 — 연락 페이지가 읽는 즉시 삭제한다(one-shot).
  CONTACT_DRAFT: "ap-contact-draft:v1",
  // 저장 전 새 글의 문서 ID. 새로고침해도 같은 ID를 써야 복구본과 올린 이미지를 찾을 수 있다.
  NEW_DEV_ARTICLE_ID: "ap-admin-dev-article-new:v1",
} as const;

const LEGACY_STORAGE_KEYS = {
  THEME: "ap-theme",
  LANG: "ap-lang",
  // 수집 주체가 늘어난 동의는 승계하지 않는다 — 발견 즉시 삭제하고 배너를 다시 띄운다.
  ANALYTICS_CONSENT: "ap-analytics-consent:v1",
  COMBINED_CONSENT: "ap-consent:v2",
} as const;

export { adminDevArticleDraftKey, LEGACY_STORAGE_KEYS, SESSION_STORAGE_KEYS, STORAGE_KEYS };
