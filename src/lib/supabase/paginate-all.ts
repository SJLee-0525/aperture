/**
 * PostgREST 서버의 기본 `max_rows`. 한 요청이 돌려주는 최대 행 수이며,
 * 초과분은 오류가 아니라 조용히 잘린다.
 */
const POSTGREST_PAGE_SIZE = 1000;

/**
 * 페이지가 꽉 차지 않을 때까지 `fetchPage` 를 반복 호출해 전량을 모은다.
 *
 * 호출자는 고유 2차 키를 포함한 정렬을 보장해야 한다. 동점 행의 상대 순서가 정의되지
 * 않으면 페이지 경계에서 행이 중복되거나 빠진다.
 *
 * 전체 행 수가 페이지 크기의 배수면 마지막에 빈 페이지를 한 번 더 읽는다.
 *
 * @param {(offset: number, size: number) => Promise<T[]>} fetchPage 지정한 구간을 읽는 함수.
 * @returns {Promise<T[]>} 페이지를 이어 붙인 전체 행.
 */
const paginateAll = async <T>(
  fetchPage: (offset: number, size: number) => Promise<T[]>,
): Promise<T[]> => {
  const rows: T[] = [];
  for (let offset = 0; ; offset += POSTGREST_PAGE_SIZE) {
    const page = await fetchPage(offset, POSTGREST_PAGE_SIZE);
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) return rows;
  }
};

export { POSTGREST_PAGE_SIZE, paginateAll };
