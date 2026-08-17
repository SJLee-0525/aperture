// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDevArticlesAdmin } from "@/features/admin-dev-articles/_hooks/use-dev-articles-admin";

import type { AdminDevArticleListItem } from "@/types/admin";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  setPublished: vi.fn(),
  setPinned: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/features/admin-dev-articles/_lib/dev-article-repository", () => ({
  getDevArticleRepository: () => ({
    list: mocks.list,
    setPublished: mocks.setPublished,
    setPinned: mocks.setPinned,
    remove: mocks.remove,
  }),
}));

const UPDATED_AT = new Date("2026-08-01T00:00:00.000Z");

const item = (
  id: string,
  over: Partial<AdminDevArticleListItem> = {},
): AdminDevArticleListItem => ({
  id,
  slug: id,
  title: { ko: `${id} 제목`, en: `${id} title` },
  tags: [],
  pinned: false,
  published: false,
  publishedAt: null,
  updatedAt: UPDATED_AT,
  ...over,
});

/** 해소 시점을 테스트가 정하는 약속. 두 요청이 겹친 순간을 재현한다. */
const deferred = () => {
  let settle!: (error?: Error) => void;
  const promise = new Promise<void>((resolve, reject) => {
    settle = (error?: Error) => (error ? reject(error) : resolve());
  });
  // 해소 전에 reject 가 붙지 않으면 node 가 unhandled rejection 으로 본다.
  promise.catch(() => undefined);
  return { promise, settle };
};

const setup = async () => {
  const view = renderHook(() => useDevArticlesAdmin());
  await waitFor(() => expect(view.result.current.status).toBe("ready"));
  return view;
};

/** 필터·정렬을 거친 목록에서 한 행을 찾는다. 순서가 아니라 id 로 본다. */
const rowOf = (rows: AdminDevArticleListItem[], id: string) => rows.find((row) => row.id === id);

beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue([item("a1"), item("b1")]);
  mocks.setPublished.mockReset().mockResolvedValue(undefined);
  mocks.setPinned.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue({ imageCleanupWarning: null });
});

afterEach(() => {
  cleanup();
});

describe("useDevArticlesAdmin — 겹치는 낙관적 갱신", () => {
  it("공개 갱신의 재조회가 진행 중인 다른 행의 고정을 덮지 않는다", async () => {
    const publish = deferred();
    const pin = deferred();
    mocks.setPublished.mockReturnValue(publish.promise);
    mocks.setPinned.mockReturnValue(pin.promise);
    const { result } = await setup();

    act(() => {
      void result.current.togglePublished("a1", true);
      void result.current.togglePinned("b1", true);
    });

    // 재조회 응답은 요청을 보낸 시점의 상태다 — b1 의 고정이 아직 반영돼 있지 않다.
    mocks.list.mockResolvedValue([item("a1", { published: true }), item("b1")]);
    await act(async () => {
      publish.settle();
      await publish.promise;
    });

    expect(rowOf(result.current.articles, "b1")?.pinned).toBe(true);
    expect(rowOf(result.current.articles, "a1")?.published).toBe(true);

    await act(async () => {
      pin.settle();
      await pin.promise;
    });
  });

  it("공개 갱신의 재조회가 같은 행의 진행 중인 고정을 덮지 않는다", async () => {
    // 고정 버튼만 진행 중 잠금을 걸어서, 같은 글의 공개 버튼은 그 사이에도 눌린다.
    const publish = deferred();
    const pin = deferred();
    mocks.setPublished.mockReturnValue(publish.promise);
    mocks.setPinned.mockReturnValue(pin.promise);
    const { result } = await setup();

    act(() => {
      void result.current.togglePinned("a1", true);
      void result.current.togglePublished("a1", true);
    });

    // 재조회 응답에는 a1 의 고정이 아직 반영돼 있지 않다.
    mocks.list.mockResolvedValue([item("a1", { published: true }), item("b1")]);
    await act(async () => {
      publish.settle();
      await publish.promise;
    });

    expect(rowOf(result.current.articles, "a1")?.pinned).toBe(true);
    expect(rowOf(result.current.articles, "a1")?.published).toBe(true);

    await act(async () => {
      pin.settle();
      await pin.promise;
    });

    expect(rowOf(result.current.articles, "a1")?.pinned).toBe(true);
  });

  it("공개 갱신 중 지운 행이 재조회 결과로 되살아나지 않는다", async () => {
    const publish = deferred();
    mocks.setPublished.mockReturnValue(publish.promise);
    const { result } = await setup();

    act(() => {
      void result.current.togglePublished("a1", true);
    });
    await act(async () => {
      await result.current.remove("b1");
    });

    mocks.list.mockResolvedValue([item("a1", { published: true }), item("b1")]);
    await act(async () => {
      publish.settle();
      await publish.promise;
    });

    expect(rowOf(result.current.articles, "b1")).toBeUndefined();
  });

  it("공개 갱신 실패가 다른 행의 변경을 되돌리지 않는다", async () => {
    const publish = deferred();
    mocks.setPublished.mockReturnValue(publish.promise);
    const { result } = await setup();

    act(() => {
      void result.current.togglePublished("a1", true);
    });
    await act(async () => {
      await result.current.togglePinned("b1", true);
    });
    await act(async () => {
      publish.settle(new Error("공개 상태 변경에 실패했습니다."));
      await publish.promise.catch(() => undefined);
    });

    expect(rowOf(result.current.articles, "b1")?.pinned).toBe(true);
    expect(rowOf(result.current.articles, "a1")?.published).toBe(false);
    expect(result.current.error).toBe("공개 상태 변경에 실패했습니다.");
  });

  // 저장은 끝났고 정렬 기준 재조회만 실패한 상태다. 되돌리면 저장된 값과 화면이 어긋난다.
  it("재조회 실패는 이미 저장된 공개 상태를 되돌리지 않는다", async () => {
    mocks.list
      .mockResolvedValueOnce([item("a1"), item("b1")])
      .mockRejectedValue(new Error("목록을 불러오지 못했습니다."));
    const { result } = await setup();

    await act(async () => {
      await result.current.togglePublished("a1", true);
    });

    expect(rowOf(result.current.articles, "a1")?.published).toBe(true);
    expect(result.current.error).toBe("목록을 불러오지 못했습니다.");
  });

  it("고정 요청의 진행 상태는 행마다 독립이다", async () => {
    const first = deferred();
    const second = deferred();
    mocks.setPinned.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = await setup();

    act(() => {
      void result.current.togglePinned("a1", true);
      void result.current.togglePinned("b1", true);
    });
    expect(result.current.pendingPinIds.has("a1")).toBe(true);
    expect(result.current.pendingPinIds.has("b1")).toBe(true);

    await act(async () => {
      first.settle();
      await first.promise;
    });

    expect(result.current.pendingPinIds.has("a1")).toBe(false);
    expect(result.current.pendingPinIds.has("b1")).toBe(true);

    await act(async () => {
      second.settle();
      await second.promise;
    });
    expect(result.current.pendingPinIds.size).toBe(0);
  });

  it("고정 실패는 그 행만 되돌린다", async () => {
    mocks.setPinned.mockRejectedValue(new Error("고정 상태 변경에 실패했습니다."));
    const { result } = await setup();

    await act(async () => {
      await result.current.togglePinned("a1", true);
    });

    expect(rowOf(result.current.articles, "a1")?.pinned).toBe(false);
    expect(result.current.error).toBe("고정 상태 변경에 실패했습니다.");
  });
});
