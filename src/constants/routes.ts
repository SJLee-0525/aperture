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
  DEV: "/dev", // 기술 스택
  DEV_PROJECTS: "/dev/projects",
  DEV_CAREER: "/dev/career",
  DEV_ABOUT: "/dev/about", // 소개
  // 연락처 (섹션 아님 — 전역 페이지)
  CONTACT: "/contact",
  // 관리자
  ADMIN: "/admin",
  LOGIN: "/admin/login",
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
} as const;

/** 앨범 상세 경로 (/photo/albums/[id]) */
const albumRoute = (id: string) => `${ROUTES.PHOTO_ALBUMS}/${id}`;

/** 관리자 사진 수정 경로 */
const adminPhotoRoute = (id: string) => `${ROUTES.ADMIN_PHOTOS}/${id}`;

/** 관리자 앨범 수정 경로 */
const adminAlbumRoute = (id: string) => `${ROUTES.ADMIN_ALBUMS}/${id}`;

/** 사진 상세 모달 딥링크 쿼리 (현재 페이지에 ?photo= 부착) */
const photoQuery = (id: string) => `?photo=${id}`;

/** 연주 상세 모달 딥링크 쿼리 (/music 에 ?work= 부착) */
const workQuery = (id: string) => `?work=${id}`;

/** 프로젝트 상세 모달 딥링크 쿼리 (/dev 에 ?project= 부착) */
const projectQuery = (id: string) => `?project=${id}`;

export {
  ROUTES,
  albumRoute,
  adminAlbumRoute,
  adminPhotoRoute,
  photoQuery,
  workQuery,
  projectQuery,
};
