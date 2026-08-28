/** 한 번에 요청하는 행 수. PostgREST 서버가 이보다 적게 돌려줘도 동작한다. */
const POSTGREST_PAGE_SIZE = 1000;

/**
 * 무한 반복 방어. 이 저장소의 어떤 테이블도 정상 범위에서 닿지 않는 누적 행 수다.
 *
 * 페이지 횟수가 아니라 행 수로 센다. 횟수로 막으면 서버가 한 번에 적게 돌려줄 때
 * 정상 데이터를 오류로 만든다.
 */
const MAX_PAGINATED_ROWS = 500_000;

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
 * @param fetchPage 지정한 구간을 읽는 함수.
 * @param [options] `maxRows` 는 안전 상한. 테스트가 낮춰 잡을 수 있다.
 * @returns 페이지를 이어 붙인 전체 행.
 * @throws {Error} 누적 행 수가 상한을 넘을 때.
 */
const paginateAll = async <T>(
  fetchPage: (offset: number, size: number) => Promise<T[]>,
  options: { maxRows?: number } = {},
): Promise<T[]> => {
  const maxRows = options.maxRows ?? MAX_PAGINATED_ROWS;
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const received = await fetchPage(offset, POSTGREST_PAGE_SIZE);
    if (received.length === 0) return rows;
    // 담기 전에 본다. 뒤에 검사하면 상한을 넘는 데이터를 메모리에 올린 뒤에 던진다.
    if (rows.length + received.length > maxRows) {
      throw new Error("목록이 안전 상한을 넘었거나 서버가 offset 을 반영하지 않습니다.");
    }
    rows.push(...received);
    offset += received.length;
  }
};

export { MAX_PAGINATED_ROWS, POSTGREST_PAGE_SIZE, paginateAll };
