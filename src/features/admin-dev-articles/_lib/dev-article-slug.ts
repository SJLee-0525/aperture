import { romanize } from "es-hangul";

import type { LocalizedText } from "@/types/localized";

/**
 * URL 세그먼트 길이 상한. 브라우저·검색 엔진 제약이 아니라 읽기 쉬운 주소를 유지하려는 값이다.
 * 넘치면 잘라 내고 관리자가 첫 발행 전까지 고칠 수 있다.
 */
const ARTICLE_SLUG_MAX_LENGTH = 80;

/** 한국어 제목에서 뽑을 때 붙는 로마자 표기를 그대로 쓰므로 영문·숫자·하이픈만 남긴다. */
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;

/**
 * slug 를 저장 형태로 맞춘다. 관리자가 직접 입력한 값과 자동 제안이 같은 규칙을 거친다.
 *
 * 한글이 남아 있으면 로마자로 바꾼다. 주소창·공유 링크·검색 결과에서 한글 slug 는
 * percent 인코딩으로 보여 읽을 수 없고, 발행 뒤에는 고칠 수 없으므로 저장 전에 정리한다.
 *
 * @param {string} raw 입력한 값 또는 제목에서 만든 후보.
 * @returns {string} 영문 소문자·숫자·하이픈만 남은 slug. 남는 글자가 없으면 빈 문자열.
 */
const normalizeArticleSlug = (raw: string): string =>
  romanize(raw.trim())
    .toLowerCase()
    .replace(NON_SLUG_CHARACTERS, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ARTICLE_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

/**
 * 제목에서 slug 를 제안한다. 영어 제목이 있으면 그쪽을 쓰고 없으면 한국어 제목을 로마자로 바꾼다.
 *
 * 제안일 뿐이라 관리자가 첫 발행 전까지 고칠 수 있다. 로마자 표기가 어색해도 되돌릴 수 있으므로
 * 제안을 비워 두고 매번 손으로 적게 하는 쪽보다 낫다.
 *
 * @param {LocalizedText} title 글 제목.
 * @returns {string} 제안 slug. 두 제목이 모두 비어 있으면 빈 문자열.
 */
const suggestArticleSlug = (title: LocalizedText): string =>
  normalizeArticleSlug(title.en) || normalizeArticleSlug(title.ko);

/**
 * 같은 slug 를 쓰는 다른 글이 있는지 본다.
 *
 * @param {string} slug 검사할 slug.
 * @param {Array<{ id: string; slug: string }>} articles 비교 대상 글 목록.
 * @param {string} [selfId] 편집 중인 글의 ID. 자기 자신은 중복으로 보지 않는다.
 * @returns {boolean} 다른 글이 이미 쓰고 있으면 true.
 */
const isArticleSlugTaken = (
  slug: string,
  articles: Array<{ id: string; slug: string }>,
  selfId?: string,
): boolean => articles.some((article) => article.slug === slug && article.id !== selfId);

export { ARTICLE_SLUG_MAX_LENGTH, isArticleSlugTaken, normalizeArticleSlug, suggestArticleSlug };
