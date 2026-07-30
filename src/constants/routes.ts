/** 라우트 단일 출처 */
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
  DEV: "/dev", // 기술 스택(개발 섹션 내부 루트)
  DEV_PROJECTS: "/dev/projects", // 랜딩의 개발 진입 목적지
  DEV_CAREER: "/dev/career",
  DEV_ABOUT: "/dev/about", // 소개
  // 연락처 (섹션 아님 — 전역 페이지)
  CONTACT: "/contact",
  // 통합 검색 (사진·음악·개발 전 섹션)
  SEARCH: "/search",
  // 관리자
  ADMIN: "/admin",
  LOGIN: "/admin/login",
  ADMIN_GLOBAL: "/admin/global", // 전역 — 랜딩(타이핑·리드)·연락(리드·링크)
  ADMIN_PHOTO: "/admin/photo", // 사진 관리 허브 (작업·앨범·태그·소개 묶음)
  ADMIN_PHOTOS: "/admin/photos",
  ADMIN_PHOTO_NEW: "/admin/photos/new",
  ADMIN_ALBUMS: "/admin/albums",
  ADMIN_ALBUM_NEW: "/admin/albums/new",
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
  ADMIN_MAINTENANCE: "/admin/maintenance",
} as const;

/** 앨범 상세 경로 (/photo/albums/[id]) */
const albumRoute = (id: string) => `${ROUTES.PHOTO_ALBUMS}/${id}`;

/** 관리자 사진 수정 경로 */
const adminPhotoRoute = (id: string) => `${ROUTES.ADMIN_PHOTOS}/${id}`;

/** 관리자 앨범 수정 경로 */
const adminAlbumRoute = (id: string) => `${ROUTES.ADMIN_ALBUMS}/${id}`;

/** 관리자 음악 연주 수정 경로 */
const adminMusicWorkRoute = (id: string) => `${ROUTES.ADMIN_MUSIC_WORKS}/${id}`;

/** 관리자 음악 수상 수정 경로 */
const adminMusicAwardRoute = (id: string) => `${ROUTES.ADMIN_MUSIC_AWARDS}/${id}`;

/** 관리자 음악 영상 수정 경로 */
const adminMusicMediaRoute = (id: string) => `${ROUTES.ADMIN_MUSIC_MEDIA}/${id}`;

/** 관리자 개발 프로젝트 수정 경로 */
const adminDevProjectRoute = (id: string) => `${ROUTES.ADMIN_DEV_PROJECTS}/${id}`;

export {
  ROUTES,
  albumRoute,
  adminAlbumRoute,
  adminMusicWorkRoute,
  adminMusicAwardRoute,
  adminMusicMediaRoute,
  adminDevProjectRoute,
  adminPhotoRoute,
};
