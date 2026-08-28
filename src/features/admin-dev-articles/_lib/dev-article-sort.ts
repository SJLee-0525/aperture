import type { AdminDevArticleListItem } from "@/types/admin";

/**
 * 관리자 목록 정렬.
 *
 * 발행 글은 공개 목록과 같은 `publishedAt` 내림차순 · 같은 발행일에는 id 오름차순이다
 * (`lib/content/dev-articles.ts` 의 공개 비교자와 같은 규칙).
 *
 * 초안은 `publishedAt` 이 없어 그 축에 자리가 없다. 발행 글보다 위에 두고 최근에 고친 순으로
 * 늘어놓는다. 관리자가 목록에서 먼저 찾는 것은 지금 쓰고 있는 글이다.
 * 초안의 `publishedAt` 이 비어 있어 이 정렬은 DB 쿼리로 표현할 수 없다. 화면 쪽 순수 함수로 남는다.
 *
 * @returns `Array.prototype.sort` 비교 결과.
 */
const compareAdminArticles = (a: AdminDevArticleListItem, b: AdminDevArticleListItem): number => {
  if (!a.publishedAt && !b.publishedAt) return b.updatedAt.getTime() - a.updatedAt.getTime();
  if (!a.publishedAt) return -1;
  if (!b.publishedAt) return 1;

  const gap = b.publishedAt.getTime() - a.publishedAt.getTime();
  return gap !== 0 ? gap : a.id.localeCompare(b.id);
};

/**
 * 목록을 관리자 순서로 정렬한다. 원본 배열은 그대로 둔다.
 *
 * @param items 저장소가 준 목록.
 * @returns 정렬한 새 배열.
 */
const sortAdminArticles = (items: AdminDevArticleListItem[]): AdminDevArticleListItem[] =>
  [...items].sort(compareAdminArticles);

export { sortAdminArticles };
