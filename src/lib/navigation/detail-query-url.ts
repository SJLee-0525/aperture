import { pushCurrentUrl, replaceCurrentUrl } from "@/lib/navigation/replace-current-url";

import type { DetailQueryKey } from "@/constants/routes";

/** href 를 만들 기준이 되는 현재 위치. */
type CurrentUrl = {
  pathname: string;
  /** 앞의 `?` 는 있어도 없어도 된다. */
  search: string;
  hash?: string;
};

/**
 * 상세 키만 바꾸고 나머지 query 는 그대로 둔 href.
 *
 * 사진 그리드는 태그·카메라 필터를 query 로 들고 있다. 여기서 전체 query 를 새로 쓰면
 * 모달을 닫았을 때 필터가 풀린 목록으로 돌아간다.
 *
 * @param current 훅은 App Router 가 준 값을, 훅 밖의 호출부는 `window.location` 을 넘긴다.
 */
const detailQueryHref = (current: CurrentUrl, key: DetailQueryKey, id: string | null): string => {
  const params = new URLSearchParams(current.search);
  if (id) params.set(key, id);
  else params.delete(key);
  const query = params.toString();
  return `${current.pathname}${query ? `?${query}` : ""}${current.hash ?? ""}`;
};

/**
 * 상세를 새 history entry 로 연다. 뒤로가기가 목록으로 돌아가야 하는 첫 진입 전용이다.
 * 열린 상태에서 다른 항목으로 옮길 때 쓰면 닫기가 이전 항목을 다시 연다.
 */
const openDetailQuery = (key: DetailQueryKey, id: string): void => {
  pushCurrentUrl(detailQueryHref(window.location, key, id));
};

/** 열려 있는 상세를 다른 항목으로 바꾸거나 닫는다. entry 를 쌓지 않는다. */
const replaceDetailQuery = (key: DetailQueryKey, id: string | null): void => {
  replaceCurrentUrl(detailQueryHref(window.location, key, id));
};

export { detailQueryHref, openDetailQuery, replaceDetailQuery };
export type { CurrentUrl };
