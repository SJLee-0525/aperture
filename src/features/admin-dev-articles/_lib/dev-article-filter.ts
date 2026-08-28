import type { AdminDevArticleListItem } from "@/types/admin";

/** 목록 위 상태 필터. 초안과 발행 글을 오가며 확인하는 것이 관리자 목록의 주된 쓰임이다. */
type AdminArticleStatusFilter = "all" | "draft" | "published";

/**
 * 검색어가 글 하나에 걸리는지 본다. 제목(한·영)과 주소를 본다 —
 * 본문은 목록 응답에 없고(§5의 projection), 태그는 id 라 사람이 기억하는 값이 아니다.
 *
 * @param item 검사할 목록 행.
 * @param keyword 소문자로 맞춘 검색어.
 * @returns 걸리면 true.
 */
const matchesKeyword = (item: AdminDevArticleListItem, keyword: string): boolean =>
  [item.title.ko, item.title.en, item.slug].some((value) => value.toLowerCase().includes(keyword));

/**
 * 상태 필터와 검색어를 적용한다.
 *
 * @param items 정렬된 목록.
 * @param query 필터 조건.
 * @param query.status 초안·발행·전체.
 * @param query.keyword 제목·주소에서 찾을 문자열. 공백만 있으면 검색하지 않는다.
 * @returns 조건을 만족하는 행.
 */
const filterAdminArticles = (
  items: AdminDevArticleListItem[],
  query: { status: AdminArticleStatusFilter; keyword: string },
): AdminDevArticleListItem[] => {
  const keyword = query.keyword.trim().toLowerCase();
  return items.filter((item) => {
    if (query.status === "draft" && item.published) return false;
    if (query.status === "published" && !item.published) return false;
    return keyword ? matchesKeyword(item, keyword) : true;
  });
};

export { filterAdminArticles };
export type { AdminArticleStatusFilter };
