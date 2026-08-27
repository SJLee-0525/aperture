/** 라우트 단일 출처 */
/**
 * 상세 모달을 여는 query 키.
 *
 * 상세는 별도 페이지가 아니라 `?photo=`·`?work=`·`?award=`·`?project=` 딥링크다
 * (CONTEXT.md 「Navigation and detail behavior」). 앨범은 경로를 쓰지만 갤러리 안에서
 * 여는 사진 모달과 함께 분석에 남는다.
 */
const DETAIL_QUERY_KEYS = {
  photo: "photo",
  work: "work",
  award: "award",
  project: "project",
  album: "album",
} as const;

type DetailQueryKey = (typeof DETAIL_QUERY_KEYS)[keyof typeof DETAIL_QUERY_KEYS];

const ROUTES = {
  // 통합 셸
  LANDING: "/", // 랜딩 허브 (A3)
  // 사진 섹션 (/photo/*)
  PHOTO: "/photo", // 작업(Work)
  PHOTO_ALBUMS: "/photo/albums",
  PHOTO_MAP: "/photo/map",
  PHOTO_ABOUT: "/photo/about",
  // 음악 섹션 (/music/*) — 사진처럼 개별 페이지
  MUSIC: "/music", // 연주
  MUSIC_CAREER: "/music/career", // 학력·경력·수상
  MUSIC_MEDIA: "/music/media",
  MUSIC_ABOUT: "/music/about", // 소개
  // 개발 섹션 (/dev/*) — Phase C
  DEV: "/dev", // 소개(개발 섹션 내부 루트). 구 /dev/about 은 next.config 가 여기로 308.
  DEV_PROJECTS: "/dev/projects", // 랜딩의 개발 진입 목적지
  DEV_CAREER: "/dev/career", // 학력·경력·수상 + 기술 스택
  DEV_ARTICLES: "/dev/articles", // 블로그 목록 (B4 에서 화면 구현)
  // 연락처 (섹션 아님 — 전역 페이지)
  CONTACT: "/contact",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  ACCESSIBILITY: "/accessibility",
  // 통합 검색 (사진·음악·개발 전 섹션)
  SEARCH: "/search",
  // 관리자
  ADMIN: "/admin",
  LOGIN: "/admin/login",
  ADMIN_GLOBAL: "/admin/global", // 전역 — 랜딩(타이핑·리드)·연락(리드·링크)
  ADMIN_PHOTO: "/admin/photo", // 사진 관리 허브 (작업·앨범·태그·소개 묶음)
  ADMIN_PHOTOS: "/admin/photos",
  ADMIN_ALBUMS: "/admin/albums",
  ADMIN_TAGS: "/admin/tags",
  ADMIN_SITE: "/admin/site",
  ADMIN_MUSIC: "/admin/music",
  ADMIN_MUSIC_WORKS: "/admin/music/works",
  ADMIN_MUSIC_AWARDS: "/admin/music/awards",
  ADMIN_MUSIC_MEDIA: "/admin/music/media",
  ADMIN_MUSIC_CONFIG: "/admin/music/config",
  ADMIN_DEV: "/admin/dev",
  ADMIN_DEV_PROJECTS: "/admin/dev/projects",
  ADMIN_DEV_CONFIG: "/admin/dev/config",
  ADMIN_DEV_ARTICLES: "/admin/dev/articles",
  ADMIN_MAINTENANCE: "/admin/maintenance",
} as const;

/**
 * 앨범 상세 경로 (/photo/albums/[id])
 *
 * @param {string} id
 * @returns {string}
 */
const albumRoute = (id: string) => `${ROUTES.PHOTO_ALBUMS}/${id}`;

/**
 * 관리자 사진 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
/**
 * 신규 작성 경로. 목록 경로 뒤에 `/new` 를 붙인다.
 *
 * 리터럴로 두면 목록 경로를 바꿀 때 수정 경로 함수 여덟은 따라오고 이쪽 일곱만
 * 조용히 갈린다.
 *
 * @param {string} listRoute 목록 경로. `ROUTES.ADMIN_*` 를 넘긴다.
 * @returns {string} 신규 작성 경로.
 */
const adminNewRoute = (listRoute: string) => `${listRoute}/new`;

const adminPhotoRoute = (id: string) => `${ROUTES.ADMIN_PHOTOS}/${id}`;

/**
 * 관리자 앨범 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
const adminAlbumRoute = (id: string) => `${ROUTES.ADMIN_ALBUMS}/${id}`;

/**
 * 관리자 음악 연주 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
const adminMusicWorkRoute = (id: string) => `${ROUTES.ADMIN_MUSIC_WORKS}/${id}`;

/**
 * 관리자 음악 수상 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
const adminMusicAwardRoute = (id: string) => `${ROUTES.ADMIN_MUSIC_AWARDS}/${id}`;

/**
 * 관리자 음악 영상 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
const adminMusicMediaRoute = (id: string) => `${ROUTES.ADMIN_MUSIC_MEDIA}/${id}`;

/**
 * 관리자 개발 프로젝트 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
const adminDevProjectRoute = (id: string) => `${ROUTES.ADMIN_DEV_PROJECTS}/${id}`;

/**
 * 관리자 블로그 글 수정 경로
 *
 * @param {string} id
 * @returns {string}
 */
const adminDevArticleRoute = (id: string) => `${ROUTES.ADMIN_DEV_ARTICLES}/${id}`;

/**
 * 관리자 전용 블로그 전체 페이지 미리보기 경로. 공개 상세와 같은 화면을 관리자 인증 안에서만 연다.
 *
 * @param {string} id
 * @returns {string}
 */
const adminDevArticlePreviewRoute = (id: string) => `${adminDevArticleRoute(id)}/preview`;

/**
 * 개발 프로젝트 상세 모달 딥링크
 *
 * @param {string} id
 * @returns {string}
 */
const devProjectRoute = (id: string) => `${ROUTES.DEV_PROJECTS}?project=${encodeURIComponent(id)}`;

/**
 * 블로그 글 상세 경로 (/dev/articles/[slug]) — 식별자는 문서 ID 가 아니라 slug 다.
 *
 * @param {string} slug 발행 후에는 바뀌지 않는 글 slug.
 * @returns {string}
 */
const devArticleRoute = (slug: string) => `${ROUTES.DEV_ARTICLES}/${slug}`;

/**
 * slug 는 영어 제목이나 한글 로마자에서 만들어 소문자·숫자·하이픈만 남는다
 * (`admin-dev-articles/_lib/dev-article-slug`). 대문자·밑줄·percent-encoding 은 slug 가 아니다.
 */
const DEV_ARTICLE_PATH_PATTERN = new RegExp(`^${ROUTES.DEV_ARTICLES}/([a-z0-9-]+)$`);

/**
 * 로케일을 뗀 경로가 블로그 상세인지 보고 slug 를 돌려준다.
 *
 * 챗봇의 화면 문맥 판정과 WebMCP 의 현재 글 해석이 같은 계약을 써야 해서 여기 둔다.
 * 두 곳이 각자 정규식을 들면 한쪽만 고쳤을 때 조용히 갈라진다.
 * 끝의 슬래시는 호출부가 미리 정리한다.
 *
 * @param {string} localPathname 로케일 프리픽스를 뗀 경로.
 * @returns {string | null} 상세 경로면 slug, 아니면 null.
 */
const matchDevArticleSlug = (localPathname: string): string | null =>
  DEV_ARTICLE_PATH_PATTERN.exec(localPathname)?.[1] ?? null;

export {
  DETAIL_QUERY_KEYS,
  ROUTES,
  albumRoute,
  matchDevArticleSlug,
  adminAlbumRoute,
  adminDevArticlePreviewRoute,
  adminDevArticleRoute,
  adminMusicWorkRoute,
  adminNewRoute,
  adminMusicAwardRoute,
  adminMusicMediaRoute,
  adminDevProjectRoute,
  adminPhotoRoute,
  devArticleRoute,
  devProjectRoute,
};
export type { DetailQueryKey };
