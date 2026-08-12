/**
 * 색을 입힐 수 있는 언어. 값은 그대로 하이라이터의 문법 이름이다.
 *
 * 다른 문법을 안에 끼워 넣는 언어(`html`, `markdown` 처럼)는 넣지 않는다.
 * 하나를 넣으면 그 안에 박힌 문법까지 서버 번들에 딸려 들어와 크기를 예측하기 어려워진다.
 */
type ArticleCodeLanguage =
  | "javascript"
  | "jsx"
  | "typescript"
  | "tsx"
  | "java"
  | "c"
  | "cpp"
  | "python"
  | "bash"
  | "json"
  | "css"
  | "sql";

/**
 * 코드 fence 에 적는 표기 → 문법 이름.
 *
 * 관리자가 `js` 로 쓰든 `javascript` 로 쓰든 같은 결과를 내야 하므로 별칭을 한 곳에 모은다.
 * 여기 없는 표기는 색 없이 그대로 보여 준다 — 틀린 색으로 칠하느니 안 칠하는 편이 낫다.
 */
const CODE_LANGUAGE_ALIASES: Record<string, ArticleCodeLanguage> = {
  js: "javascript",
  javascript: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  jsx: "jsx",
  ts: "typescript",
  typescript: "typescript",
  tsx: "tsx",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  "c++": "cpp",
  cc: "cpp",
  hpp: "cpp",
  py: "python",
  python: "python",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  json: "json",
  jsonc: "json",
  css: "css",
  sql: "sql",
};

/**
 * 코드 fence 표기를 문법 이름으로 정규화한다.
 *
 * @param {string} raw fence 에 적힌 표기. 언어를 적지 않았으면 빈 문자열.
 * @returns {ArticleCodeLanguage | null} 아는 언어면 문법 이름, 아니면 null(색 없이 렌더).
 */
const normalizeCodeLanguage = (raw: string): ArticleCodeLanguage | null =>
  CODE_LANGUAGE_ALIASES[raw.trim().toLowerCase()] ?? null;

export { normalizeCodeLanguage };
export type { ArticleCodeLanguage };
