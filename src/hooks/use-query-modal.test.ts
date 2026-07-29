// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useQueryModal } from "@/hooks/use-query-modal";

const navigation = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  pathname: "/dev/projects",
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: navigation.back,
    push: navigation.push,
    replace: navigation.replace,
  }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}));

const projects = [{ id: "project-1" }, { id: "project-2" }];

describe("useQueryModal", () => {
  beforeEach(() => {
    navigation.back.mockReset();
    navigation.push.mockReset();
    navigation.replace.mockReset();
    navigation.pathname = "/dev/projects";
    navigation.searchParams = new URLSearchParams();
    vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("쿼리 id와 일치하는 항목을 열린 모달 상태로 반환한다", () => {
    navigation.searchParams = new URLSearchParams("project=project-2");

    const { result } = renderHook(() => useQueryModal("project", projects));

    expect(result.current.active).toBe(projects[1]);
    expect(result.current.open).toBe(true);
  });

  it("쿼리가 없거나 id가 일치하지 않으면 모달을 닫힌 상태로 반환한다", () => {
    navigation.searchParams = new URLSearchParams("project=missing");

    const { result } = renderHook(() => useQueryModal("project", projects));

    expect(result.current.active).toBeNull();
    expect(result.current.open).toBe(false);
  });

  it("항목 선택 시 기존 쿼리를 보존하고 모달 id만 설정한다", () => {
    navigation.searchParams = new URLSearchParams("lang=en&page=2");
    const { result } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.select("project-1"));

    expect(navigation.push).toHaveBeenCalledWith("/dev/projects?lang=en&page=2&project=project-1", {
      scroll: false,
    });
  });

  it("직접 진입한 모달을 닫으면 해당 id만 제거하고 나머지 쿼리를 유지한다", () => {
    navigation.searchParams = new URLSearchParams("lang=en&project=project-1");
    const { result } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.close());

    expect(window.history.replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/dev/projects?lang=en",
    );
  });

  it("페이지에서 연 모달을 닫으면 이전 히스토리로 돌아간다", () => {
    const { result } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.select("project-1"));
    act(() => result.current.close());

    expect(navigation.back).toHaveBeenCalledOnce();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});
