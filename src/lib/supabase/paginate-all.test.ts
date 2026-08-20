import { describe, expect, it, vi } from "vitest";

import { MAX_PAGES, POSTGREST_PAGE_SIZE, paginateAll } from "@/lib/supabase/paginate-all";

/**
 * 지정한 개수만큼 행을 가진 서버 대역.
 *
 * @param total 전체 행 수.
 * @param serverMaxRows 서버가 한 번에 돌려주는 상한. 요청 크기보다 작을 수 있다.
 */
const sourceOf = (total: number, serverMaxRows = POSTGREST_PAGE_SIZE) =>
  vi.fn(async (offset: number, size: number) => {
    const count = Math.max(0, Math.min(Math.min(size, serverMaxRows), total - offset));
    return Array.from({ length: count }, (_, index) => ({ id: offset + index }));
  });

describe("paginateAll", () => {
  it("한 페이지에 담기면 두 번째 요청으로 끝을 확인한다", async () => {
    const fetchPage = sourceOf(3);

    await expect(paginateAll(fetchPage)).resolves.toHaveLength(3);
    // 빈 페이지를 받아야 끝인 줄 안다.
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, POSTGREST_PAGE_SIZE);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 3, POSTGREST_PAGE_SIZE);
  });

  it("한 페이지를 넘으면 이어 읽어 전량을 돌려준다", async () => {
    const total = POSTGREST_PAGE_SIZE + 500;
    const fetchPage = sourceOf(total);

    const rows = await paginateAll(fetchPage);

    expect(rows).toHaveLength(total);
    expect(rows.at(-1)).toEqual({ id: total - 1 });
  });

  it("서버가 요청보다 적게 돌려줘도 절단되지 않는다", async () => {
    // max_rows 가 500 인 서버. 예전 구현은 첫 500개만 받고 끝냈다.
    const total = 1_200;
    const fetchPage = sourceOf(total, 500);

    const rows = await paginateAll(fetchPage);

    expect(rows).toHaveLength(total);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 500, POSTGREST_PAGE_SIZE);
  });

  it("첫 페이지가 비면 빈 배열이다", async () => {
    const fetchPage = sourceOf(0);

    await expect(paginateAll(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("offset 을 무시하는 서버에서는 무한 반복 대신 오류를 낸다", async () => {
    // 같은 행을 계속 돌려주면 종료 조건이 오지 않는다.
    const fetchPage = vi.fn(async () => [{ id: 0 }]);

    await expect(paginateAll(fetchPage)).rejects.toThrow("offset");
    expect(fetchPage).toHaveBeenCalledTimes(MAX_PAGES);
  });

  it("중간 페이지 조회 실패를 그대로 전달한다", async () => {
    const fetchPage = vi.fn(async (offset: number) => {
      if (offset > 0) throw new Error("읽기 실패");
      return Array.from({ length: POSTGREST_PAGE_SIZE }, (_, index) => ({ id: index }));
    });

    await expect(paginateAll(fetchPage)).rejects.toThrow("읽기 실패");
  });
});
