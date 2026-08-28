// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDetailQuerySession } from "@/hooks/use-detail-query-session";

const navigation = vi.hoisted(() => ({
  back: vi.fn(),
  pathname: "/ko/photo",
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: navigation.back }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}));

/** history 를 바꾸면 App Router 의 useSearchParams 도 따라 갱신된다(popstate). */
const trackUrl = (href: unknown) => {
  navigation.searchParams = new URLSearchParams(String(href).split("?")[1] ?? "");
};

describe("useDetailQuerySession", () => {
  beforeEach(() => {
    navigation.back.mockReset();
    navigation.pathname = "/ko/photo";
    navigation.searchParams = new URLSearchParams();
    vi.spyOn(window.history, "replaceState").mockImplementation((_s, _t, href) => trackUrl(href));
    vi.spyOn(window.history, "pushState").mockImplementation((_s, _t, href) => trackUrl(href));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("첫 열기만 history entry 를 쌓고 이어지는 이동은 교체한다", () => {
    const { result, rerender } = renderHook(() => useDetailQuerySession("photo"));

    act(() => result.current.goto("photo-1"));
    rerender();
    act(() => result.current.goto("photo-2"));

    expect(window.history.pushState).toHaveBeenCalledOnce();
    expect(window.history.replaceState).toHaveBeenCalledOnce();
  });

  it("우리가 연 상세는 뒤로가기로 닫는다", () => {
    const { result, rerender } = renderHook(() => useDetailQuerySession("photo"));

    act(() => result.current.goto("photo-1"));
    rerender();
    act(() => result.current.close());

    expect(navigation.back).toHaveBeenCalledOnce();
  });

  it("딥링크로 진입한 상세는 query 만 지운다", () => {
    navigation.searchParams = new URLSearchParams("photo=photo-1&tag=street");

    const { result } = renderHook(() => useDetailQuerySession("photo"));
    act(() => result.current.close());

    expect(navigation.back).not.toHaveBeenCalled();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      window.history.state,
      "",
      "/ko/photo?tag=street",
    );
  });

  it("openedOutside 면 훅 밖에서 열린 상세도 뒤로가기로 닫는다", () => {
    const { result, rerender } = renderHook(() =>
      useDetailQuerySession("photo", { openedOutside: true }),
    );

    // 타일이 openDetailQuery 로 push 한 상황.
    navigation.searchParams = new URLSearchParams("photo=photo-1");
    rerender();
    act(() => result.current.close());

    expect(navigation.back).toHaveBeenCalledOnce();
  });

  it("openedOutside 가 아니면 훅 밖의 열림을 우리 entry 로 세지 않는다", () => {
    const { result, rerender } = renderHook(() => useDetailQuerySession("project"));

    navigation.searchParams = new URLSearchParams("project=p-1");
    rerender();
    act(() => result.current.close());

    expect(navigation.back).not.toHaveBeenCalled();
  });
});
