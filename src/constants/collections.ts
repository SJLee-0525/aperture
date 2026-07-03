/** Firestore 컬렉션명 단일 출처 — 문자열 직박 금지(hook 경고), 항상 이 상수 경유 */
const COLLECTIONS = {
  PHOTOS: "photos",
  ALBUMS: "albums",
  // 음악 섹션
  MUSIC_WORKS: "musicWorks",
  MUSIC_AWARDS: "musicAwards",
  MUSIC_MEDIA: "musicMedia",
  // 개발 섹션
  DEV_PROJECTS: "devProjects",
  SITE: "site",
} as const;

/** site 컬렉션의 고정 문서 ID */
const SITE_DOC = "config"; // 전역 + 사진
const SITE_MUSIC_DOC = "music"; // 음악 섹션 설정
const SITE_DEV_DOC = "dev"; // 개발 섹션 설정

export { COLLECTIONS, SITE_DOC, SITE_MUSIC_DOC, SITE_DEV_DOC };
