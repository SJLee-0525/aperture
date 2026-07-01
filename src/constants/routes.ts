/** 라우트 단일 출처 */
const ROUTES = {
  HOME: "/", // 작업(Work)
  ALBUMS: "/albums",
  MAP: "/map",
  ABOUT: "/about",
  ADMIN: "/admin",
  LOGIN: "/admin/login",
} as const;

/** 앨범 상세 경로 */
const albumRoute = (id: string) => `/albums/${id}`;

/** 사진 상세 모달 딥링크 쿼리 (현재 페이지에 ?photo= 부착) */
const photoQuery = (id: string) => `?photo=${id}`;

export { ROUTES, albumRoute, photoQuery };
