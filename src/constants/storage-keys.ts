/** localStorage 키 단일 출처 — 테마·언어 영속화 + 좋아요 중복 방지에 사용 */
const STORAGE_KEYS = {
  THEME: "ap-theme",
  LANG: "ap-lang",
  LIKED_PHOTOS: "ap-liked", // 이 브라우저가 좋아요한 사진 id[] — 브라우저당 1회 가드
} as const;

export { STORAGE_KEYS };
