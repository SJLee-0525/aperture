/** 한 번에 요청하는 행 수. PostgREST 서버가 이보다 적게 돌려줘도 동작한다. */
const POSTGREST_PAGE_SIZE = 1000;

/**
 * 무한 반복 방어. 이 횟수를 넘으면 서버가 `offset` 을 무시하고 있다고 본다.
 * 1,000행씩 500번이면 50만 행이라, 이 저장소의 어떤 테이블도 정상 범위에서 닿지 않는다.
 */
const MAX_PAGES = 500;

/**
 * 빈 페이지를 만날 때까지 `fetchPage` 를 반복 호출해 전량을 모은다.
 *
 * 다음 `offset` 은 요청한 크기가 아니라 **실제로 받은 행 수**만큼 늘린다. 서버의
 * `max_rows` 가 요청 크기보다 작아도 조용히 잘리지 않는다.
 *
 * 호출자는 고유 2차 키를 포함한 정렬을 보장해야 한다. 동점 행의 상대 순서가 정의되지
 * 않으면 페이지 경계에서 행이 중복되거나 빠진다.
 *
 * 종료를 확인하려면 빈 페이지를 한 번 더 읽어야 하므로, 마지막 페이지가 꽉 차지 않아도
 * 요청이 한 번 더 나간다.
 *
 * @param {(offset: number, size: number) => Promise<T[]>} fetchPage 지정한 구간을 읽는 함수.
 * @returns {Promise<T[]>} 페이지를 이어 붙인 전체 행.
 * @throws {Error} 페이지 수가 상한을 넘을 때.
 */
const paginateAll = async <T>(
  fetchPage: (offset: number, size: number) => Promise<T[]>,
): Promise<T[]> => {
  const rows: T[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const received = await fetchPage(offset, POSTGREST_PAGE_SIZE);
    if (received.length === 0) return rows;
    rows.push(...received);
    offset += received.length;
  }
  throw new Error("목록 조회가 끝나지 않습니다. 서버가 offset 을 반영하지 않는 것 같습니다.");
};

export { MAX_PAGES, POSTGREST_PAGE_SIZE, paginateAll };
