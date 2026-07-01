/** Firestore 컬렉션명 단일 출처 — 문자열 직박 금지(hook 경고), 항상 이 상수 경유 */
const COLLECTIONS = {
  PHOTOS: "photos",
  ALBUMS: "albums",
  SITE: "site",
} as const;

/** site 컬렉션의 고정 문서 ID */
const SITE_DOC = "config";

export { COLLECTIONS, SITE_DOC };
