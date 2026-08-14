import { adminDevArticleDraftKey } from "@/constants/storage-keys";

import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

/**
 * 편집 중 잃지 않기 위한 로컬 복구본.
 *
 * 저장 버튼과는 다른 것이다 — 저장은 저장소에 쓰고, 복구본은 브라우저가 닫히거나 새로고침될 때를
 * 대비해 폼 값을 그대로 떠 두는 자리다(계획 §5). 저장에 성공하면 지운다.
 * 이미지 바이너리는 넣지 않는다. 폼이 들고 있는 것도 이미 업로드가 끝난 URL 뿐이다.
 */

/** 복구본 형식 버전. 폼 필드가 바뀌면 올리고 과거 값은 복구하지 않는다. */
const RECOVERY_VERSION = 1;

/**
 * 복구본 수명. 지난달에 덮어 둔 값이 오늘 편집을 덮어쓰는 일이 없게 짧게 잡되,
 * 주말을 넘겨 이어 쓰는 경우는 살린다.
 */
const ARTICLE_RECOVERY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredRecovery = {
  version: number;
  savedAt: number;
  input: DevArticleInput;
};

/**
 * 배열이 아닌 객체인지 확인한다.
 *
 * @param {unknown} value 확인할 값.
 * @returns {value is Record<string, unknown>} 일반 객체이면 true.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * JSON 이 문자열로 바꿔 둔 시각을 Date 로 되돌린다.
 *
 * @param {unknown} value 저장된 시각 값.
 * @returns {Date | null} 유효한 시각. 없거나 형식이 어긋나면 null.
 */
const toDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 폼 값을 복구본으로 떠 둔다.
 *
 * @param {Pick<Storage, "setItem">} storage 쓸 저장소.
 * @param {string} articleId 편집 중인 글의 문서 ID.
 * @param {DevArticleInput} input 현재 폼 값.
 * @param {number} [now] 저장 시각(ms).
 * @returns {boolean} 저장 성공 여부. 실패해도 편집은 계속한다.
 */
const writeArticleRecovery = (
  storage: Pick<Storage, "setItem">,
  articleId: string,
  input: DevArticleInput,
  now: number = Date.now(),
): boolean => {
  try {
    storage.setItem(
      adminDevArticleDraftKey(articleId),
      JSON.stringify({ version: RECOVERY_VERSION, savedAt: now, input } satisfies StoredRecovery),
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * 복구본을 읽는다. 읽기만 하고 지우지 않는다 — 복구할지는 관리자가 고른다.
 *
 * @param {Pick<Storage, "getItem">} storage 읽을 저장소.
 * @param {string} articleId 편집 중인 글의 문서 ID.
 * @param {number} [now] 만료를 판단할 현재 시각(ms).
 * @returns {{ savedAt: number; input: DevArticleInput } | null} 복구본과 저장 시각.
 *   값이 없거나 형이 어긋나거나 만료됐으면 null.
 */
const readArticleRecovery = (
  storage: Pick<Storage, "getItem">,
  articleId: string,
  now: number = Date.now(),
): { savedAt: number; input: DevArticleInput } | null => {
  let raw: string | null;
  try {
    raw = storage.getItem(adminDevArticleDraftKey(articleId));
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== RECOVERY_VERSION) return null;

  const { savedAt, input } = parsed;
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
  // 시계 조작·손상 값 방어: 미래에 저장됐거나 수명을 넘긴 값은 쓰지 않는다.
  if (savedAt > now || now - savedAt > ARTICLE_RECOVERY_TTL_MS) return null;
  if (!isRecord(input) || typeof input.body !== "string") return null;

  return {
    savedAt,
    input: {
      // JSON 은 Date 를 담지 못한다. 폼이 곧바로 쓰도록 발행 시각만 되돌려 놓는다.
      ...(input as unknown as DevArticleInput),
      publishedAt: toDate(input.publishedAt),
      firstPublishedAt: toDate(input.firstPublishedAt),
    },
  };
};

/**
 * 복구본을 지운다. 저장에 성공했거나 관리자가 복구를 거절했을 때 부른다.
 *
 * @param {Pick<Storage, "removeItem">} storage 지울 저장소.
 * @param {string} articleId 편집 중인 글의 문서 ID.
 * @returns {void}
 */
const clearArticleRecovery = (storage: Pick<Storage, "removeItem">, articleId: string): void => {
  try {
    storage.removeItem(adminDevArticleDraftKey(articleId));
  } catch {
    // 지우지 못해도 편집을 막지 않는다. 다음 저장이 같은 키를 덮어쓴다.
  }
};

export { ARTICLE_RECOVERY_TTL_MS, clearArticleRecovery, readArticleRecovery, writeArticleRecovery };
