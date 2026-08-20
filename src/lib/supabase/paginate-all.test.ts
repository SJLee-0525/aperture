import { describe, expect, it, vi } from "vitest";

import { POSTGREST_PAGE_SIZE, paginateAll } from "@/lib/supabase/paginate-all";

/** 지정한 개수만큼 행을 만드는 페이지 소스. */
const sourceOf = (total: number) =>
  vi.fn(async (offset: number, size: number) =>
    Array.from({ length: Math.max(0, Math.min(size, total - offset)) }, (_, index) => ({
      id: offset + index,
    })),
  );

describe("paginateAll", () => {
  it("페이지가 꽉 차지 않으면 한 번만 읽는다", async () => {
    const fetchPage = sourceOf(3);

    await expect(paginateAll(fetchPage)).resolves.toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, POSTGREST_PAGE_SIZE);
  });

  it("한 페이지를 넘으면 이어 읽어 전량을 돌려준다", async () => {
    const total = POSTGREST_PAGE_SIZE + 500;
    const fetchPage = sourceOf(total);

    const rows = await paginateAll(fetchPage);

    expect(rows).toHaveLength(total);
    expect(rows.at(-1)).toEqual({ id: total - 1 });
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, POSTGREST_PAGE_SIZE, POSTGREST_PAGE_SIZE);
  });

  it("전체가 페이지 크기의 배수면 빈 페이지를 한 번 더 읽고 끝낸다", async () => {
    const fetchPage = sourceOf(POSTGREST_PAGE_SIZE);

    await expect(paginateAll(fetchPage)).resolves.toHaveLength(POSTGREST_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("첫 페이지가 비면 빈 배열이다", async () => {
    const fetchPage = sourceOf(0);

    await expect(paginateAll(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("페이지 조회 실패를 그대로 전달한다", async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error("읽기 실패");
    });

    await expect(paginateAll(fetchPage)).rejects.toThrow("읽기 실패");
  });
});
