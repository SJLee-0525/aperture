// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

type Item = { id: string; order: number; published: boolean };

const items = (): Item[] => [
  { id: "a", order: 0, published: true },
  { id: "b", order: 1, published: true },
  { id: "c", order: 2, published: false },
];

const adapterOf = (overrides: Partial<Parameters<typeof useOrderedAdmin<Item>>[0]> = {}) => ({
  list: vi.fn(async () => items()),
  updateOrder: vi.fn(async () => undefined),
  setPublished: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  ...overrides,
});

const renderReady = async (adapter: ReturnType<typeof adapterOf>) => {
  const rendered = renderHook(() => useOrderedAdmin<Item>(adapter));
  await waitFor(() => expect(rendered.result.current.status).toBe("ready"));
  return rendered;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOrderedAdmin — 일괄 정렬 계약", () => {
  it("드래그 1회는 바뀐 항목만 담은 배열 1건으로 저장한다", async () => {
    const adapter = adapterOf();
    const { result } = await renderReady(adapter);

    await act(() => result.current.reorder("a", "c"));

    expect(adapter.updateOrder).toHaveBeenCalledTimes(1);
    expect(adapter.updateOrder).toHaveBeenCalledWith([
      { id: "b", order: 0 },
      { id: "c", order: 1 },
      { id: "a", order: 2 },
    ]);
    expect(result.current.items.map(({ id }) => id)).toEqual(["b", "c", "a"]);
  });

  it("같은 자리로의 드래그는 저장을 호출하지 않는다", async () => {
    const adapter = adapterOf();
    const { result } = await renderReady(adapter);

    await act(() => result.current.reorder("a", "a"));

    expect(adapter.updateOrder).not.toHaveBeenCalled();
  });

  it("저장 실패는 권위 목록을 다시 읽어 화면을 되돌린다", async () => {
    const adapter = adapterOf({
      updateOrder: vi.fn(async () => {
        throw new Error("순서 저장에 실패했습니다.");
      }),
    });
    const { result } = await renderReady(adapter);

    await act(() => result.current.reorder("a", "c"));

    // 실패 후 reload(list 2회째)가 서버 순서를 복원한다.
    expect(adapter.list).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe("순서 저장에 실패했습니다.");
    expect(result.current.items.map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("reload 까지 실패하면 드래그 이전 순서로 복원한다", async () => {
    let listCalls = 0;
    const adapter = adapterOf({
      list: vi.fn(async () => {
        listCalls += 1;
        if (listCalls > 1) throw new Error("목록 재조회 실패");
        return items();
      }),
      updateOrder: vi.fn(async () => {
        throw new Error("순서 저장에 실패했습니다.");
      }),
    });
    const { result } = await renderReady(adapter);

    await act(() => result.current.reorder("a", "c"));

    expect(result.current.items.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(result.current.error).toBe("순서 저장에 실패했습니다.");
  });
});
