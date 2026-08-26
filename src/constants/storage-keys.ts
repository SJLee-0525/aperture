/** 테마, 언어, 관리자 작업본에 사용하는 localStorage 키. */
const STORAGE_KEYS = {
  THEME: "ap-theme:v1",
  LANG: "ap-lang:v1",
  // v3: GA와 Sentry를 각각 선택할 수 있는 세분화 동의(ADR-0004).
  CONSENT: "ap-consent:v3",
  // 저장은 됐지만 공개 캐시 무효화가 실패한 대상. 관리자가 재시도할 때까지 남는다.
  ADMIN_REVALIDATE_FAILURE: "ap-admin-revalidate-failure:v1",
  // mock 모드의 블로그 글 저장소.
  ADMIN_DEV_ARTICLES: "ap-admin-dev-articles:v1",
  // 관리자 mock 저장소는 E2E 초기화를 위해 `ap-admin-` 접두사를 공유한다.
  ADMIN_PHOTOS: "ap-admin-photos:v1",
  ADMIN_ALBUMS: "ap-admin-albums:v1",
  ADMIN_MUSIC_WORKS: "ap-admin-music-works:v1",
  ADMIN_MUSIC_AWARDS: "ap-admin-music-awards:v1",
  ADMIN_MUSIC_MEDIA: "ap-admin-music-media:v1",
  ADMIN_DEV_PROJECTS: "ap-admin-dev-projects:v1",
  ADMIN_SITE_CONFIG: "ap-admin-site-config:v1",
  ADMIN_MUSIC_CONFIG: "ap-admin-music-config:v1",
  ADMIN_DEV_CONFIG: "ap-admin-dev-config:v1",
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

/** 탭 안에서 한 번 전달할 값에 사용하는 sessionStorage 키. */
const SESSION_STORAGE_KEYS = {
  // 연락 페이지가 한 번 읽고 삭제하는 챗봇 초안.
  CONTACT_DRAFT: "ap-contact-draft:v1",
  // 저장 전 새 글의 문서 ID. 새로고침해도 같은 ID를 써야 복구본과 올린 이미지를 찾을 수 있다.
  NEW_DEV_ARTICLE_ID: "ap-admin-dev-article-new:v1",
} as const;

const LEGACY_STORAGE_KEYS = {
  THEME: "ap-theme",
  LANG: "ap-lang",
  // 현재 동의 범위와 다른 이전 값은 삭제하고 배너를 다시 표시한다.
  ANALYTICS_CONSENT: "ap-analytics-consent:v1",
  COMBINED_CONSENT: "ap-consent:v2",
} as const;

export {
  ADMIN_DEV_ARTICLE_DRAFT_KEY_PREFIX,
  adminDevArticleDraftKey,
  LEGACY_STORAGE_KEYS,
  SESSION_STORAGE_KEYS,
  STORAGE_KEYS,
};
