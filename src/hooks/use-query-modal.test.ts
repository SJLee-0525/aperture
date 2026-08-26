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

/**
 * history 를 바꾸면 App Router 의 useSearchParams 도 따라 갱신된다(pushCurrentUrl 이
 * popstate 를 보낸다). 그 동기화를 흉내내지 않으면 "이미 열려 있는가" 판정을 검증할 수 없다.
 */
const trackUrl = (href: unknown) => {
  const query = String(href).split("?")[1] ?? "";
  navigation.searchParams = new URLSearchParams(query);
};

describe("useQueryModal", () => {
  beforeEach(() => {
    navigation.back.mockReset();
    navigation.push.mockReset();
    navigation.replace.mockReset();
    navigation.pathname = "/dev/projects";
    navigation.searchParams = new URLSearchParams();
    vi.spyOn(window.history, "replaceState").mockImplementation((_state, _title, href) =>
      trackUrl(href),
    );
    vi.spyOn(window.history, "pushState").mockImplementation((_state, _title, href) =>
      trackUrl(href),
    );
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

    expect(window.history.pushState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/dev/projects?lang=en&page=2&project=project-1",
    );
    expect(navigation.push).not.toHaveBeenCalled();
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
    const { result, rerender } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.select("project-1"));
    rerender();
    act(() => result.current.close());

    expect(navigation.back).toHaveBeenCalledOnce();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("딥링크 모달을 닫은 뒤 다른 항목을 열면 새 id로 history를 추가한다", () => {
    navigation.searchParams = new URLSearchParams("project=project-1");
    const { result, rerender } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.close());
    rerender();
    act(() => result.current.select("project-2"));

    expect(window.history.replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/dev/projects",
    );
    expect(window.history.pushState).toHaveBeenLastCalledWith(
      window.history.state,
      "",
      "/dev/projects?project=project-2",
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });

  /**
   * 재현 경로는 에이전트·챗봇이다(use-dev-tools 의 select). 사용자 클릭만으로는 모달이
   * 그리드를 덮어 두 번 열기 어렵다. history 에 A 가 남으면 닫기 버튼이 A 를 다시 연다.
   */
  it("열린 상태에서 다른 항목으로 옮기면 history를 쌓지 않는다", () => {
    const { result, rerender } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.select("project-1"));
    rerender();
    act(() => result.current.select("project-2"));
    rerender();

    expect(window.history.pushState).toHaveBeenCalledOnce();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      window.history.state,
      "",
      "/dev/projects?project=project-2",
    );
    expect(result.current.active).toBe(projects[1]);
  });

  it("연속으로 연 뒤 닫으면 뒤로가기 한 번으로 목록에 돌아간다", () => {
    const { result, rerender } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.select("project-1"));
    rerender();
    act(() => result.current.select("project-2"));
    rerender();
    act(() => result.current.close());

    expect(navigation.back).toHaveBeenCalledOnce();
  });

  // 뒤로가기로 닫힌 뒤에도 openedHere 가 참으로 남으면, 다음 닫기가 우리가 쌓지 않은
  // history entry 로 돌아가 방문자를 이전 페이지로 내보낸다.
  it("외부 요인으로 닫히면 다음 닫기는 쿼리만 지운다", () => {
    const { result, rerender } = renderHook(() => useQueryModal("project", projects));

    act(() => result.current.select("project-1"));
    rerender();
    // 브라우저 뒤로가기: URL 에서 쿼리가 사라진다.
    navigation.searchParams = new URLSearchParams();
    rerender();
    // 딥링크로 다시 열린 상태를 흉내낸다.
    navigation.searchParams = new URLSearchParams("project=project-1");
    rerender();
    act(() => result.current.close());

    expect(navigation.back).not.toHaveBeenCalled();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      window.history.state,
      "",
      "/dev/projects",
    );
  });
});
