/** 라우트 단일 출처 */
const ROUTES = {
  HOME: "/", // 작업(Work)
  ALBUMS: "/albums",
  MAP: "/map",
  ABOUT: "/about",
  ADMIN: "/admin",
  LOGIN: "/admin/login",
  ADMIN_PHOTOS: "/admin/photos",
  ADMIN_PHOTO_NEW: "/admin/photos/new",
} as const;

/** 앨범 상세 경로 */
const albumRoute = (id: string) => `/albums/${id}`;

/** 관리자 사진 수정 경로 */
const adminPhotoRoute = (id: string) => `/admin/photos/${id}`;

/** 사진 상세 모달 딥링크 쿼리 (현재 페이지에 ?photo= 부착) */
const photoQuery = (id: string) => `?photo=${id}`;

export { ROUTES, albumRoute, adminPhotoRoute, photoQuery };
