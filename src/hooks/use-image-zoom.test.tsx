// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useImageZoom } from "@/hooks/use-image-zoom";

type Options = Parameters<typeof useImageZoom>[0];

type ProbeProps = Options & { onSingleTap?: () => void };

const Probe = ({ onSingleTap, ...options }: ProbeProps) => {
  const { stageRef, zoomed, reset, handleStageClick } = useImageZoom(options);

  return (
    <div data-testid="parent" data-zoomed={zoomed || undefined}>
      <div
        data-testid="surface"
        ref={stageRef}
        onClick={() => handleStageClick(() => onSingleTap?.())}
      />
      <button data-testid="reset" type="button" onClick={() => reset(true)} />
    </div>
  );
};

const SwapProbe = ({ slot, ...options }: Options & { slot: "a" | "b" }) => {
  const { stageRef } = useImageZoom(options);

  return (
    <div data-testid="parent">
      <div data-testid="slot-a" ref={slot === "a" ? stageRef : undefined} />
      <div data-testid="slot-b" ref={slot === "b" ? stageRef : undefined} />
    </div>
  );
};

const point = (x: number, y: number) => ({ clientX: x, clientY: y });

const surface = () => screen.getByTestId("surface");

const surfaceScale = (node: HTMLElement = surface()) =>
  Number(/scale\(([\d.]+)\)/.exec(node.style.transform)?.[1] ?? Number.NaN);

/** jsdom 은 레이아웃이 없어 표면 300×200, 부모 rect (0,0,300,200) 을 직접 정의한다. */
const mockLayout = (node: HTMLElement) => {
  Object.defineProperty(node, "offsetWidth", { value: 300, configurable: true });
  Object.defineProperty(node, "offsetHeight", { value: 200, configurable: true });
  const parent = node.parentElement;
  if (parent) {
    parent.getBoundingClientRect = () =>
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
};

const mountProbe = (props: ProbeProps) => {
  const view = render(<Probe {...props} />);
  mockLayout(surface());
  return view;
};

/** 제스처에 걸린 시간. 더블탭 판정을 좌우하므로 테스트가 직접 정한다. */
let clock = 0;

const twoTouches = (
  a: [number, number],
  b: [number, number],
  extra: Record<string, unknown> = {},
) => ({ touches: [point(...a), point(...b)], cancelable: true, ...extra });

const pinchStart = (a: [number, number], b: [number, number]) =>
  fireEvent.touchStart(surface(), twoTouches(a, b));

const pinchMove = (a: [number, number], b: [number, number]) =>
  fireEvent.touchMove(surface(), twoTouches(a, b));

const endTouches = () => fireEvent.touchEnd(surface(), { touches: [] });

/** 손가락 간격을 2배로 벌려 배율 2 를 만든다. */
const zoomToTwo = () => {
  pinchStart([100, 100], [200, 100]);
  pinchMove([50, 100], [250, 100]);
  endTouches();
};

const tap = (x = 150, y = 100) => {
  fireEvent.touchStart(surface(), { touches: [point(x, y)] });
  endTouches();
};

const doubleTap = (x = 150, y = 100) => {
  tap(x, y);
  clock += 100;
  tap(x, y);
};

describe("useImageZoom", () => {
  let onZoomChange: Mock<(zoomed: boolean) => void>;

  const baseProps = () => ({ enabled: true, resetKey: "img-1", onZoomChange });

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    onZoomChange = vi.fn<(zoomed: boolean) => void>();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("핀치", () => {
    it("손가락 간격만큼 확대하고 줌 경계 전환을 알린다", () => {
      mountProbe(baseProps());

      zoomToTwo();

      expect(surface().style.transform).toBe("translate3d(0px, 0px, 0) scale(2)");
      expect(screen.getByTestId("parent").dataset.zoomed).toBe("true");
      expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("중점 아래의 표면 점을 고정한다", () => {
      mountProbe(baseProps());

      pinchStart([150, 100], [250, 100]);
      pinchMove([100, 100], [300, 100]);

      // 초점 (50,0) 기준: t' = 50 - (50 - 0) * 2 = -50
      expect(surface().style.transform).toBe("translate3d(-50px, 0px, 0) scale(2)");
    });

    it("최대 배율 밖은 저항만 주고 놓으면 최대치로 돌아온다", () => {
      mountProbe(baseProps());

      pinchStart([140, 100], [160, 100]);
      pinchMove([40, 100], [260, 100]);
      // raw 11 → 3 + 8 * 0.15
      expect(surfaceScale()).toBeCloseTo(4.2);

      endTouches();
      expect(surfaceScale()).toBe(3);
      expect(surface().style.transition).toContain("transform 240ms");
    });

    it("1 미만으로 오므리면 놓을 때 원배율로 돌아온다", () => {
      mountProbe(baseProps());

      pinchStart([100, 100], [200, 100]);
      pinchMove([130, 100], [170, 100]);
      endTouches();

      expect(surface().style.transform).toBe("translate3d(0px, 0px, 0) scale(1)");
      expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("핀치 도중 touchcancel 이 와도 배율을 한계 안으로 정리한다", () => {
      mountProbe(baseProps());

      pinchStart([140, 100], [160, 100]);
      pinchMove([40, 100], [260, 100]);
      fireEvent.touchCancel(surface());

      expect(surfaceScale()).toBe(3);
    });

    it("경계 전환은 이동이 여러 번이어도 한 번만 알린다", () => {
      mountProbe(baseProps());

      pinchStart([100, 100], [200, 100]);
      pinchMove([80, 100], [220, 100]);
      pinchMove([60, 100], [240, 100]);
      pinchMove([50, 100], [250, 100]);
      endTouches();

      expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(true);
    });
  });

  describe("팬", () => {
    it("확대 상태의 한 손가락 이동을 표면 크기 안으로 클램프한다", () => {
      mountProbe(baseProps());
      zoomToTwo();

      fireEvent.touchStart(surface(), { touches: [point(150, 100)] });
      fireEvent.touchMove(surface(), { touches: [point(500, 500)], cancelable: true });

      // 한계 = 300 * (2 - 1) / 2 = 150, 세로 = 200 * (2 - 1) / 2 = 100
      expect(surface().style.transform).toBe("translate3d(150px, 100px, 0) scale(2)");
    });

    it("확대 상태의 touchmove 는 기본 동작을 막고 원배율은 통과시킨다", () => {
      mountProbe(baseProps());
      zoomToTwo();

      fireEvent.touchStart(surface(), { touches: [point(150, 100)] });
      const prevented = !fireEvent.touchMove(surface(), {
        touches: [point(200, 100)],
        cancelable: true,
      });
      expect(prevented).toBe(true);

      endTouches();
      doubleTap();
      expect(surfaceScale()).toBe(1);

      fireEvent.touchStart(surface(), { touches: [point(150, 100)] });
      const passed = fireEvent.touchMove(surface(), {
        touches: [point(200, 100)],
        cancelable: true,
      });
      expect(passed).toBe(true);
    });

    it("핀치를 한 손가락만 남겨 놓으면 이어서 팬이 된다", () => {
      mountProbe(baseProps());

      pinchStart([100, 100], [200, 100]);
      pinchMove([50, 100], [250, 100]);
      fireEvent.touchEnd(surface(), { touches: [point(250, 100)] });
      fireEvent.touchMove(surface(), { touches: [point(150, 100)], cancelable: true });

      expect(surface().style.transform).toBe("translate3d(-100px, 0px, 0) scale(2)");
    });
  });

  describe("더블탭", () => {
    it("빠른 두 탭은 확대하고 다시 두 탭이면 원배율로 돌아온다", () => {
      mountProbe(baseProps());

      doubleTap();
      expect(surfaceScale()).toBe(2.5);
      expect(surface().style.transition).toContain("transform 240ms");

      clock += 1_000;
      doubleTap();
      expect(surfaceScale()).toBe(1);
    });

    it("시간이나 거리가 벌어진 두 탭은 확대하지 않는다", () => {
      mountProbe(baseProps());

      tap();
      clock += 400;
      tap();
      expect(surfaceScale()).toBe(1);

      clock += 1_000;
      tap(150, 100);
      clock += 100;
      tap(190, 100);
      expect(surfaceScale()).toBe(1);
    });

    it("touch 더블탭 뒤에 합성 dblclick 이 와도 토글은 한 번이다", () => {
      mountProbe(baseProps());

      doubleTap();
      expect(surfaceScale()).toBe(2.5);

      clock += 100;
      fireEvent.dblClick(surface(), { clientX: 150, clientY: 100 });
      expect(surfaceScale()).toBe(2.5);
    });

    it("동작 줄이기에서는 전환 없이 확대한다", () => {
      window.matchMedia = vi
        .fn()
        .mockReturnValue({ matches: true }) as unknown as typeof matchMedia;
      mountProbe(baseProps());

      doubleTap();

      expect(surfaceScale()).toBe(2.5);
      expect(surface().style.transition).toBe("none");
    });

    it("getMaxScale 이 더블탭 목표보다 작으면 그 값으로 캡한다", () => {
      mountProbe({ ...baseProps(), getMaxScale: () => 1.5 });

      doubleTap();

      expect(surfaceScale()).toBe(1.5);
    });
  });

  describe("handleStageClick", () => {
    it("단일탭은 더블탭 대기 시간 뒤 정확히 한 번 실행한다", () => {
      const onSingleTap = vi.fn();
      mountProbe({ ...baseProps(), onSingleTap });

      tap();
      fireEvent.click(surface());
      expect(onSingleTap).not.toHaveBeenCalled();

      act(() => void vi.advanceTimersByTime(300));
      expect(onSingleTap).toHaveBeenCalledOnce();

      act(() => void vi.advanceTimersByTime(1_000));
      expect(onSingleTap).toHaveBeenCalledOnce();
    });

    it("더블탭이 확정되면 보류한 단일탭을 실행하지 않는다", () => {
      const onSingleTap = vi.fn();
      mountProbe({ ...baseProps(), onSingleTap });

      tap();
      fireEvent.click(surface());
      clock += 100;
      tap();
      fireEvent.click(surface());

      act(() => void vi.advanceTimersByTime(1_000));
      expect(onSingleTap).not.toHaveBeenCalled();
      expect(surfaceScale()).toBe(2.5);
    });

    it("팬으로 움직인 스트림의 합성 click 은 무시한다", () => {
      const onSingleTap = vi.fn();
      mountProbe({ ...baseProps(), onSingleTap });
      zoomToTwo();

      fireEvent.touchStart(surface(), { touches: [point(150, 100)] });
      fireEvent.touchMove(surface(), { touches: [point(250, 100)], cancelable: true });
      endTouches();
      fireEvent.click(surface());

      act(() => void vi.advanceTimersByTime(1_000));
      expect(onSingleTap).not.toHaveBeenCalled();
    });

    it("enabled 가 꺼진 상태의 click 은 보류 없이 즉시 실행한다", () => {
      const onSingleTap = vi.fn();
      mountProbe({ ...baseProps(), onSingleTap, enabled: false });

      fireEvent.click(surface());
      expect(onSingleTap).toHaveBeenCalledOnce();

      // 더블탭 판정이 없으므로 빠른 두 번째 click 도 삼키지 않는다.
      fireEvent.click(surface());
      expect(onSingleTap).toHaveBeenCalledTimes(2);
    });

    it("보류된 단일탭은 언마운트되면 실행되지 않는다", () => {
      const onSingleTap = vi.fn();
      const { unmount } = mountProbe({ ...baseProps(), onSingleTap });

      tap();
      fireEvent.click(surface());
      unmount();

      act(() => void vi.advanceTimersByTime(1_000));
      expect(onSingleTap).not.toHaveBeenCalled();
    });

    it("enabled 가 꺼지면 보류한 단일탭을 버린다", () => {
      const onSingleTap = vi.fn();
      const { rerender } = mountProbe({ ...baseProps(), onSingleTap });

      tap();
      fireEvent.click(surface());
      rerender(<Probe {...baseProps()} onSingleTap={onSingleTap} enabled={false} />);

      act(() => void vi.advanceTimersByTime(1_000));
      expect(onSingleTap).not.toHaveBeenCalled();
    });

    it("데스크톱 더블클릭은 단일 클릭 두 번으로 새지 않고 확대한다", () => {
      const onSingleTap = vi.fn();
      mountProbe({ ...baseProps(), onSingleTap });

      fireEvent.click(surface());
      fireEvent.click(surface());
      fireEvent.dblClick(surface(), { clientX: 150, clientY: 100 });

      act(() => void vi.advanceTimersByTime(1_000));
      expect(onSingleTap).not.toHaveBeenCalled();
      expect(surfaceScale()).toBe(2.5);
    });
  });

  describe("휠과 마우스 팬", () => {
    it("휠은 커서를 초점으로 확대하고 최대치를 넘지 않는다", () => {
      mountProbe(baseProps());

      fireEvent.wheel(surface(), { deltaY: -400, clientX: 250, clientY: 100, cancelable: true });

      const expected = Math.exp(0.8);
      expect(surfaceScale()).toBeCloseTo(expected);
      // 초점 (100,0) 기준: t' = 100 * (1 - s)
      const tx = Number(/translate3d\((-?[\d.]+)px/.exec(surface().style.transform)?.[1]);
      expect(tx).toBeCloseTo(100 * (1 - expected));

      for (let i = 0; i < 10; i += 1) {
        fireEvent.wheel(surface(), { deltaY: -400, clientX: 150, clientY: 100, cancelable: true });
      }
      expect(surfaceScale()).toBe(3);
    });

    it("원배율에서 축소 휠은 아무것도 바꾸지 않는다", () => {
      mountProbe(baseProps());

      fireEvent.wheel(surface(), { deltaY: 400, clientX: 150, clientY: 100, cancelable: true });

      expect(surfaceScale()).toBe(1);
    });

    it("확대 상태에서만 마우스 드래그로 팬한다", () => {
      mountProbe(baseProps());

      fireEvent.mouseDown(surface(), { clientX: 150, clientY: 100, button: 0 });
      fireEvent.mouseMove(window, { clientX: 250, clientY: 100 });
      expect(surfaceScale()).toBe(1);

      doubleTap();
      fireEvent.mouseDown(surface(), { clientX: 150, clientY: 100, button: 0 });
      expect(surface().style.cursor).toBe("grabbing");
      fireEvent.mouseMove(window, { clientX: 250, clientY: 100 });
      expect(surface().style.transform).toBe("translate3d(100px, 0px, 0) scale(2.5)");

      fireEvent.mouseUp(window);
      expect(surface().style.cursor).toBe("grab");
    });

    it("마우스 팬 중 enabled 가 꺼지면 window 리스너를 거둔다", () => {
      const { rerender } = mountProbe(baseProps());

      doubleTap();
      fireEvent.mouseDown(surface(), { clientX: 150, clientY: 100, button: 0 });
      rerender(<Probe {...baseProps()} enabled={false} />);

      expect(surface().style.transform).toBe("");
      fireEvent.mouseMove(window, { clientX: 250, clientY: 100 });
      expect(surface().style.transform).toBe("");
    });
  });

  describe("리셋과 재바인딩", () => {
    it("resetKey 가 바뀌면 전환 없이 원배율로 돌아온다", () => {
      const { rerender } = mountProbe(baseProps());

      zoomToTwo();
      rerender(<Probe {...baseProps()} resetKey="img-2" />);

      // 리스너 재바인딩 cleanup 이 인라인 스타일까지 걷는다. 빈 transform = 원배율.
      expect(surface().style.transform).toBe("");
      expect(screen.getByTestId("parent").dataset.zoomed).toBeUndefined();
      expect(onZoomChange).toHaveBeenLastCalledWith(false);
    });

    it("reset(true) 는 전환과 함께 원배율로 돌아온다", () => {
      mountProbe(baseProps());

      zoomToTwo();
      fireEvent.click(screen.getByTestId("reset"));

      expect(surfaceScale()).toBe(1);
      expect(surface().style.transition).toContain("transform 240ms");
    });

    it("enabled 가 꺼지면 즉시 원배율이 되고 입력에 반응하지 않는다", () => {
      const { rerender } = mountProbe(baseProps());

      zoomToTwo();
      rerender(<Probe {...baseProps()} enabled={false} />);
      expect(surface().style.transform).toBe("");

      pinchStart([100, 100], [200, 100]);
      pinchMove([50, 100], [250, 100]);
      expect(surface().style.transform).toBe("");
    });

    it("노드가 옮겨 붙으면 이전 노드는 입력에 반응하지 않는다", () => {
      const { rerender } = render(<SwapProbe enabled resetKey="a" slot="a" />);
      const slotA = screen.getByTestId("slot-a");
      const slotB = screen.getByTestId("slot-b");
      mockLayout(slotA);
      mockLayout(slotB);

      fireEvent.touchStart(slotA, twoTouches([100, 100], [200, 100]));
      fireEvent.touchMove(slotA, twoTouches([50, 100], [250, 100]));
      expect(surfaceScale(slotA)).toBe(2);

      rerender(<SwapProbe enabled resetKey="b" slot="b" />);
      expect(slotA.style.transform).toBe("");

      fireEvent.touchStart(slotA, twoTouches([100, 100], [200, 100]));
      fireEvent.touchMove(slotA, twoTouches([50, 100], [250, 100]));
      expect(slotA.style.transform).toBe("");

      fireEvent.touchStart(slotB, twoTouches([100, 100], [200, 100]));
      fireEvent.touchMove(slotB, twoTouches([50, 100], [250, 100]));
      expect(surfaceScale(slotB)).toBe(2);
    });

    it("onZoomChange 가 바뀌어도 최신 콜백을 호출한다", () => {
      const replaced = vi.fn<(zoomed: boolean) => void>();
      const { rerender } = mountProbe(baseProps());

      zoomToTwo();
      rerender(<Probe enabled resetKey="img-1" onZoomChange={replaced} />);

      clock += 1_000;
      doubleTap();
      expect(replaced).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  describe("브라우저 기본 줌 차단", () => {
    it("두 손가락 touchstart 와 gesturestart 의 기본 동작을 막는다", () => {
      mountProbe(baseProps());

      const prevented = !pinchStart([100, 100], [200, 100]);
      expect(prevented).toBe(true);

      const gestureEvent = new Event("gesturestart", { cancelable: true });
      surface().dispatchEvent(gestureEvent);
      expect(gestureEvent.defaultPrevented).toBe(true);
    });
  });
});
