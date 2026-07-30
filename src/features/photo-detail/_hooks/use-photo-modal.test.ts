// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePhotoModal } from "@/features/photo-detail/_hooks/use-photo-modal";
import type { Photo } from "@/types/photo";

const navigation = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  pathname: "/photo",
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: navigation.back, replace: navigation.replace }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}));

const photos = [{ id: "photo-1" }, { id: "photo-2" }] as Photo[];

describe("usePhotoModal", () => {
  beforeEach(() => {
    navigation.back.mockReset();
    navigation.replace.mockReset();
    navigation.pathname = "/photo";
    navigation.searchParams = new URLSearchParams();
    vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("직접 딥링크로 진입한 모달은 쿼리를 제거해 닫는다", () => {
    navigation.searchParams = new URLSearchParams("lang=en&photo=photo-1");
    const { result } = renderHook(() => usePhotoModal(photos));

    act(() => result.current.close());

    expect(window.history.replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/photo?lang=en",
    );
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it("페이지에 머문 채 열린 모달은 뒤로가기로 닫는다", () => {
    const { result, rerender } = renderHook(() => usePhotoModal(photos));
    navigation.searchParams = new URLSearchParams("photo=photo-1");
    rerender();

    act(() => result.current.close());

    expect(navigation.back).toHaveBeenCalledOnce();
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("이전·다음 사진은 히스토리를 늘리지 않고 현재 항목을 교체한다", () => {
    navigation.searchParams = new URLSearchParams("photo=photo-1");
    const onNavigateStart = vi.fn();
    const { result } = renderHook(() => usePhotoModal(photos, true, onNavigateStart));

    act(() => result.current.next());

    expect(onNavigateStart).toHaveBeenCalledWith("photo-2");
    expect(window.history.replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/photo?photo=photo-2",
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("상세 패널이 확장되어 이동이 잠기면 버튼과 방향키로 사진을 바꾸지 않는다", () => {
    navigation.searchParams = new URLSearchParams("photo=photo-1");
    const { result } = renderHook(() => usePhotoModal(photos, false));

    act(() => {
      result.current.next();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });

    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("상세 데이터가 일부만 로드돼도 전체 ID 순서로 이동한다", () => {
    navigation.searchParams = new URLSearchParams("photo=photo-1");
    const loadedPhotos = [{ id: "photo-1" }] as Photo[];
    const { result } = renderHook(() =>
      usePhotoModal(loadedPhotos, true, undefined, ["photo-1", "photo-2", "photo-3"]),
    );

    act(() => result.current.prev());

    expect(window.history.replaceState).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/photo?photo=photo-3",
    );
  });
});
