/** 라우트 단일 출처 */
const ROUTES = {
  // 통합 셸
  LANDING: "/", // 랜딩 허브 (A3)
  // ⚠️ legacy 별칭 — 값은 A1에서 /photo/* 로 이동 완료. 현행 SiteHeader/NAV_ITEMS/링크가 참조.
  //    A2(mega-menu 재작성) 때 이 4개 키를 제거하고 아래 PHOTO* 로 일원화한다.
  HOME: "/photo", // 작업(Work)
  ALBUMS: "/photo/albums",
  MAP: "/photo/map",
  ABOUT: "/photo/about",
  // 사진 섹션 (/photo/*) — 정식 키
  PHOTO: "/photo", // 작업(Work)
  PHOTO_ALBUMS: "/photo/albums",
  PHOTO_MAP: "/photo/map",
  PHOTO_ABOUT: "/photo/about",
  // 음악 · 개발 섹션 (단일 스크롤)
  MUSIC: "/music",
  DEV: "/dev",
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
  ADMIN_MUSIC_SCHEDULE: "/admin/music/schedule",
  ADMIN_MUSIC_AWARDS: "/admin/music/awards",
  ADMIN_MUSIC_MEDIA: "/admin/music/media",
  ADMIN_MUSIC_CONFIG: "/admin/music/config",
  ADMIN_DEV: "/admin/dev",
  ADMIN_DEV_PROJECTS: "/admin/dev/projects",
  ADMIN_DEV_CONFIG: "/admin/dev/config",
} as const;

/** 앨범 상세 경로 — 현행 /albums/[id] (A1에서 /photo/albums/[id] 로 이동) */
const albumRoute = (id: string) => `${ROUTES.ALBUMS}/${id}`;

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
