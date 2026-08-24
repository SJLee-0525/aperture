// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { ImageLightbox } from "@/components/ImageLightbox";

import type { ImageMeta } from "@/types/image";

vi.mock("next/image", () => ({
  default: ({ src, alt, onLoad, onError }: Record<string, unknown>) =>
    createElement("img", { src, alt, onLoad, onError, "data-testid": "slide-image" }),
}));

vi.mock("motion/react", () => {
  const MOTION_ONLY = new Set(["initial", "animate", "exit", "transition"]);
  const strip = (tag: string) => {
    const Component = (props: Record<string, unknown>) =>
      createElement(
        tag,
        Object.fromEntries(Object.entries(props).filter(([key]) => !MOTION_ONLY.has(key))),
      );
    return Component;
  };
  return {
    AnimatePresence: ({ children }: { children: unknown }) => children,
    m: { div: strip("div"), button: strip("button"), span: strip("span") },
  };
});

vi.mock("@/hooks/use-overlay-layer", () => ({ useOverlayLayer: () => true }));

const imageOf = (id: string) =>
  ({ url: `https://cdn.test/${id}.webp`, path: `media/${id}.webp`, w: 1200, h: 800 }) as ImageMeta;

const IMAGES = [imageOf("a"), imageOf("b"), imageOf("c")];

const point = (x: number, y: number) => ({ clientX: x, clientY: y });

/** 현재 슬라이드(index)의 줌 표면. 이미지의 부모 래퍼다. */
const zoomSurfaceAt = (index: number) => {
  const parent = screen.getAllByTestId("slide-image")[index]?.parentElement;
  if (!parent) throw new Error("zoom surface not found");
  return parent;
};

const track = () => {
  const node = document.querySelector("[data-image-lightbox-track]");
  if (!(node instanceof HTMLElement)) throw new Error("track not found");
  return node;
};

/** 제스처에 걸린 시간. 더블탭 판정을 좌우하므로 테스트가 직접 정한다. */
let clock = 0;

describe("ImageLightbox", () => {
  let onClose: Mock<() => void>;
  let onNavigate: Mock<(index: number) => void>;
  let scrollTo: Mock<(options: ScrollToOptions) => void>;

  const baseProps = () => ({
    images: IMAGES,
    index: 1,
    alt: "예시",
    closeLabel: "닫기",
    previousLabel: "이전 이미지",
    nextLabel: "다음 이미지",
    onClose,
    onNavigate,
  });

  /** 렌더 후 현재 슬라이드 로드까지 마치고 jsdom 에 없는 레이아웃 값을 정의한다. */
  const mount = () => {
    render(<ImageLightbox {...baseProps()} />);
    const image = screen.getAllByTestId("slide-image")[1];
    if (image) fireEvent.load(image);

    const trackNode = track();
    Object.defineProperty(trackNode, "clientWidth", { value: 400, configurable: true });
    trackNode.scrollTo = scrollTo as unknown as typeof trackNode.scrollTo;

    const surface = zoomSurfaceAt(1);
    Object.defineProperty(surface, "offsetWidth", { value: 300, configurable: true });
    Object.defineProperty(surface, "offsetHeight", { value: 200, configurable: true });
    const stage = surface.parentElement;
    if (stage) {
      stage.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 300,
          height: 200,
          right: 300,
          bottom: 200,
          x: 0,
          y: 0,
        }) as DOMRect;
    }
    return surface;
  };

  const pinchZoom = (surface: HTMLElement) => {
    fireEvent.touchStart(surface, {
      touches: [point(100, 100), point(200, 100)],
      cancelable: true,
    });
    fireEvent.touchMove(surface, {
      touches: [point(50, 100), point(250, 100)],
      cancelable: true,
    });
    fireEvent.touchEnd(surface, { touches: [] });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    onClose = vi.fn<() => void>();
    onNavigate = vi.fn<(index: number) => void>();
    scrollTo = vi.fn<(options: ScrollToOptions) => void>();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("방향키로 옆 이미지로 이동한다", () => {
    mount();

    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 2 * 400, behavior: "smooth" });
  });

  it("확대가 시작되면 트랙을 현재 인덱스 위치로 재고정한다", () => {
    const surface = mount();

    pinchZoom(surface);

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 1 * 400, behavior: "auto" });
    expect(track().dataset.zoomed).toBe("true");
  });

  it("재고정은 렌더 클로저가 아니라 마지막으로 보고된 인덱스를 쓴다", () => {
    const surface = mount();

    // 관성 스크롤이 인덱스 2 를 보고했지만 부모 리렌더(index prop)는 아직인 상황.
    const trackNode = track();
    trackNode.scrollLeft = 800;
    fireEvent.scroll(trackNode);
    expect(onNavigate).toHaveBeenCalledWith(2);

    scrollTo.mockClear();
    pinchZoom(surface);

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 800, behavior: "auto" });
  });

  it("확대 중 방향키 이동은 원배율로 복귀한 뒤 이동한다", () => {
    const surface = mount();

    pinchZoom(surface);
    scrollTo.mockClear();
    fireEvent.keyDown(document, { key: "ArrowRight" });

    expect(track().dataset.zoomed).toBeUndefined();
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 2 * 400, behavior: "smooth" });
  });

  it("확대 중 내비 버튼 이동도 원배율로 복귀한 뒤 이동한다", () => {
    const surface = mount();

    pinchZoom(surface);
    scrollTo.mockClear();
    const nextButton = screen.getByLabelText("다음 이미지") as HTMLButtonElement;
    expect(nextButton.disabled).toBe(false);
    fireEvent.click(nextButton);

    expect(track().dataset.zoomed).toBeUndefined();
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ left: 2 * 400, behavior: "smooth" });
  });

  it("확대 중 ESC 는 원배율로 돌아오고 다음 ESC 가 닫는다", () => {
    const surface = mount();

    pinchZoom(surface);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(track().dataset.zoomed).toBeUndefined();
    expect((screen.getByLabelText("다음 이미지") as HTMLButtonElement).disabled).toBe(false);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("단일 탭은 더블탭 대기 뒤 크롬을 토글한다", () => {
    const surface = mount();

    fireEvent.touchStart(surface, { touches: [point(150, 100)] });
    fireEvent.touchEnd(surface, { touches: [] });
    fireEvent.click(surface);
    expect(screen.getByLabelText("다음 이미지")).toBeTruthy();

    act(() => void vi.advanceTimersByTime(300));
    expect(screen.queryByLabelText("다음 이미지")).toBeNull();
  });

  it("확대 팬으로 움직인 합성 click 은 크롬을 토글하지 않는다", () => {
    const surface = mount();

    pinchZoom(surface);
    fireEvent.touchStart(surface, { touches: [point(150, 100)] });
    fireEvent.touchMove(surface, { touches: [point(250, 100)], cancelable: true });
    fireEvent.touchEnd(surface, { touches: [] });
    fireEvent.click(surface);

    act(() => void vi.advanceTimersByTime(1_000));
    expect(screen.getByLabelText("다음 이미지")).toBeTruthy();
  });
});
