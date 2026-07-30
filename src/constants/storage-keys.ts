/** localStorage 키 단일 출처 — 테마·언어 선택을 영속한다. */
const STORAGE_KEYS = {
  THEME: "ap-theme:v1",
  LANG: "ap-lang:v1",
} as const;

const LEGACY_STORAGE_KEYS = {
  THEME: "ap-theme",
  LANG: "ap-lang",
} as const;

export { LEGACY_STORAGE_KEYS, STORAGE_KEYS };
