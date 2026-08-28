import type { DevArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-repository";

/**
 * JSON 이 문자열로 바꾼 발행 시각을 되돌린다.
 *
 * 저장·읽기·만료 규칙은 공용 `lib/admin/form-recovery` 가 갖는다. 블로그가 따로 갖는 것은
 * 이 되살리기 하나다 — 다른 폼은 Date 필드가 없거나 형태가 달라 각자 넘긴다.
 */
const toDate = (value: unknown): Date | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 저장된 복구본을 폼 값으로 되돌린다.
 *
 * @param input JSON 에서 읽은 원본.
 * @returns 발행 시각이 `Date` 로 돌아온 폼 값.
 */
const fromStoredArticleInput = (input: Record<string, unknown>): DevArticleInput => ({
  ...(input as unknown as DevArticleInput),
  publishedAt: toDate(input.publishedAt),
  firstPublishedAt: toDate(input.firstPublishedAt),
});

export { fromStoredArticleInput };
