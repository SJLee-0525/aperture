import type { DevArticleTag } from "@/types/dev-article-tag";

/** 목록 한 페이지에 놓는 글 수. 그리드·목록 보기가 같은 값을 쓴다. */
const ARTICLES_PER_PAGE = 8;

/** 보기 방식. 첫 값이 기본값이다. */
const ARTICLE_LIST_VIEWS = ["grid", "list"] as const;

type ArticleListView = (typeof ARTICLE_LIST_VIEWS)[number];

/** URL에 남기는 목록 상태. 순서는 canonical 직렬화 순서와 같다. */
type ArticleListState = {
  /** 선택한 태그 id. `null` 은 전체 — URL 에서는 키를 생략한다. */
  tag: string | null;
  view: ArticleListView;
  /** 1부터 시작한다. 상한은 필터 결과를 아는 화면이 판단한다. */
  page: number;
};

const DEFAULT_VIEW: ArticleListView = "grid";
const FIRST_PAGE = 1;

/**
 * 브라우저 URL을 관대하게 읽는다. 잘못된 값은 기본값으로 바꾸고 세 키 밖의 값은 무시한다.
 *
 * 태그는 사전에 있는 id 만 인정한다. 사진 필터와 달리 라벨로는 찾지 않는다 — 블로그 태그의
 * URL 계약은 id 하나뿐이라 라벨 매칭을 허용하면 같은 화면을 가리키는 주소가 여러 개가 된다.
 * 사전에서 지운 태그가 링크에 남아 있으면 빈 목록 대신 전체를 보여 준다.
 *
 * @param {URLSearchParams} searchParams 현재 URL 의 query. 같은 키가 여러 번 오면 첫 값을 쓴다.
 * @param {readonly DevArticleTag[]} tags 통제 태그 사전.
 * @returns {ArticleListState} 정규화된 상태. `page` 는 항상 1 이상이다.
 */
const parseArticleListQuery = (
  searchParams: URLSearchParams,
  tags: readonly DevArticleTag[],
): ArticleListState => {
  const rawTag = searchParams.get("tag")?.trim() ?? "";
  const tag = tags.some((candidate) => candidate.id === rawTag) ? rawTag : null;

  const rawView = searchParams.get("view")?.trim() ?? "";
  const view = ARTICLE_LIST_VIEWS.find((candidate) => candidate === rawView) ?? DEFAULT_VIEW;

  const rawPage = searchParams.get("page")?.trim() ?? "";
  const page = /^\d+$/.test(rawPage) ? Math.max(FIRST_PAGE, Number(rawPage)) : FIRST_PAGE;

  return { tag, view, page };
};

/**
 * 목록 상태를 canonical URL로 직렬화한다. 키 순서는 tag, view, page 이며 기본값은 생략한다.
 *
 * 같은 화면이 항상 같은 주소를 갖게 하려는 것이므로 이 세 키 밖의 값은 넣지 않는다. 정규화
 * 결과가 현재 주소와 다르면 화면이 replace 로 주소를 맞춰, 범위를 벗어난 페이지나 남은
 * 파라미터가 공유 링크에 남지 않는다.
 *
 * @param {string} pathname query 를 제외한 경로. 로케일 프리픽스 포함 여부는 호출부가 정한다.
 * @param {ArticleListState} state 정규화된 목록 상태.
 * @returns {string} query 가 비면 경로만 돌려준다.
 */
const buildArticleListHref = (pathname: string, state: ArticleListState): string => {
  const params = new URLSearchParams();
  if (state.tag) params.set("tag", state.tag);
  if (state.view !== DEFAULT_VIEW) params.set("view", state.view);
  if (state.page > FIRST_PAGE) params.set("page", String(state.page));

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
};

/**
 * 글 수에 필요한 페이지 수를 센다.
 *
 * @param {number} total 필터를 적용한 글 수.
 * @returns {number} 글이 없어도 1 — 빈 목록에도 1페이지는 존재한다.
 */
const articlePageCount = (total: number): number =>
  Math.max(FIRST_PAGE, Math.ceil(total / ARTICLES_PER_PAGE));

/**
 * 한 페이지에 보일 만큼만 잘라낸다.
 *
 * @param {readonly T[]} items 정렬을 마친 전체 목록.
 * @param {number} page 1부터 시작하는 페이지 번호. 범위 밖이면 빈 배열이 된다.
 * @returns {T[]} 해당 페이지의 글.
 */
const sliceArticlesPage = <T>(items: readonly T[], page: number): T[] => {
  const start = (page - FIRST_PAGE) * ARTICLES_PER_PAGE;
  return items.slice(start, start + ARTICLES_PER_PAGE);
};

export {
  ARTICLES_PER_PAGE,
  articlePageCount,
  buildArticleListHref,
  parseArticleListQuery,
  sliceArticlesPage,
};
export type { ArticleListView };
