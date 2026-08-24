// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { useOverlayDrag } from "@/hooks/use-overlay-drag";

import type { SwipeDirection } from "@/hooks/use-overlay-drag";

type Options = Parameters<typeof useOverlayDrag>[0];

type ProbeProps = Omit<Options, "surfaceRef" | "scrimRef"> & {
  onClickResult?: (dragged: boolean) => void;
  withScrim?: boolean;
};

const Probe = ({ onClickResult, withScrim, ...options }: ProbeProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, consumeDragged, swipeSurfaceRef } =
    useOverlayDrag({ ...options, surfaceRef, scrimRef: withScrim ? scrimRef : undefined });

  return (
    <div
      data-testid="root"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onClick={() => onClickResult?.(consumeDragged())}
    >
      <div data-testid="scrim" ref={scrimRef} />
      <div data-testid="surface" ref={surfaceRef}>
        <div data-testid="track" ref={swipeSurfaceRef} />
      </div>
    </div>
  );
};

const point = (x: number, y: number) => ({ clientX: x, clientY: y });

const root = () => screen.getByTestId("root");

/** 제스처에 걸린 시간. 속도 판정을 좌우하므로 테스트가 직접 정한다. */
let clock = 0;

const move = (from: [number, number], to: [number, number]) => {
  fireEvent.touchStart(root(), { touches: [point(...from)] });
  fireEvent.touchMove(root(), { touches: [point(...to)] });
};

const release = (elapsed = 1_000) => {
  clock += elapsed;
  fireEvent.touchEnd(root());
};

const drag = (from: [number, number], to: [number, number], elapsed?: number) => {
  move(from, to);
  release(elapsed);
};

const settle = () => act(() => void vi.advanceTimersByTime(400));

const setReducedMotion = (matches: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof matchMedia;
};

describe("useOverlayDrag", () => {
  let onDismiss: Mock<() => void>;
  let onSwipe: Mock<(direction: SwipeDirection) => void>;

  const swipeProps = () => ({
    enabled: true,
    onDismiss,
    onSwipe,
    getSwipeStageWidth: () => 300,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    onDismiss = vi.fn<() => void>();
    onSwipe = vi.fn<(direction: SwipeDirection) => void>();
    setReducedMotion(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("좌우 넘기기", () => {
    it("왼쪽으로 충분히 끌면 다음으로 넘긴다", () => {
      render(<Probe {...swipeProps()} />);

      drag([240, 200], [100, 200]);
      settle();

      expect(onSwipe).toHaveBeenCalledExactlyOnceWith(1);
    });

    it("오른쪽으로 충분히 끌면 이전으로 넘긴다", () => {
      render(<Probe {...swipeProps()} />);

      drag([100, 200], [240, 200]);
      settle();

      expect(onSwipe).toHaveBeenCalledExactlyOnceWith(-1);
    });

    it("임계치를 못 넘기면 제자리로 돌아간다", () => {
      render(<Probe {...swipeProps()} />);

      drag([240, 200], [210, 200]);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
      expect(screen.getByTestId("track").style.transform).toBe("translate3d(0, 0, 0)");
    });

    it("넘길 수 없는 방향은 저항만 주고 커밋하지 않는다", () => {
      render(<Probe {...swipeProps()} canSwipeCommit={() => false} />);

      move([240, 200], [100, 200]);
      // 이동 140px 이 저항 비율만큼만 반영된다.
      expect(screen.getByTestId("track").style.transform).toBe("translate3d(-35px, 0, 0)");

      release();
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it("스테이지 폭을 못 재면 넘기지 않는다", () => {
      render(<Probe {...swipeProps()} getSwipeStageWidth={() => 0} />);

      drag([240, 200], [100, 200]);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it("시작 지점이 허용되지 않으면 제스처를 받지 않는다", () => {
      render(<Probe {...swipeProps()} canSwipeStart={() => false} />);

      drag([240, 200], [100, 200]);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it("onSwipe 가 없으면 좌우 드래그를 무시한다", () => {
      render(<Probe enabled onDismiss={onDismiss} />);

      drag([240, 200], [100, 200]);
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("동작 줄이기에서는 기다리지 않고 한 번만 넘긴다", () => {
      setReducedMotion(true);
      render(<Probe {...swipeProps()} />);

      drag([240, 200], [100, 200]);
      expect(onSwipe).toHaveBeenCalledExactlyOnceWith(1);

      settle();
      expect(onSwipe).toHaveBeenCalledOnce();
    });

    it("touchcancel 은 넘기지도 닫지도 않는다", () => {
      render(<Probe {...swipeProps()} />);

      move([240, 200], [100, 200]);
      fireEvent.touchCancel(root());
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("예약된 전환은 언마운트되면 실행되지 않는다", () => {
      const { unmount } = render(<Probe {...swipeProps()} />);

      drag([240, 200], [100, 200]);
      unmount();
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
    });

    it("예약된 전환은 enabled 가 꺼지면 실행되지 않는다", () => {
      const { rerender } = render(<Probe {...swipeProps()} />);

      drag([240, 200], [100, 200]);
      rerender(<Probe {...swipeProps()} enabled={false} />);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
    });
  });

  describe("방향 판정", () => {
    it("위로 미는 동작은 어느 쪽으로도 해석하지 않는다", () => {
      render(<Probe {...swipeProps()} />);

      drag([200, 300], [200, 160]);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("어느 축도 우세하지 않은 대각선은 방향을 정하지 않는다", () => {
      render(<Probe {...swipeProps()} />);

      drag([200, 200], [340, 340]);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("아래로 끌어 닫기", () => {
    it("충분히 끌어내리면 닫는다", () => {
      render(<Probe {...swipeProps()} />);

      drag([200, 100], [200, 260]);
      settle();

      expect(onDismiss).toHaveBeenCalledOnce();
      expect(onSwipe).not.toHaveBeenCalled();
    });

    it("짧게 끌어내리면 닫지 않는다", () => {
      render(<Probe {...swipeProps()} />);

      drag([200, 100], [200, 140]);
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("짧아도 빠르게 튕기면 닫는다", () => {
      render(<Probe {...swipeProps()} />);

      drag([200, 100], [200, 140], 50);
      settle();

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("드래그 중 enabled 가 꺼지면 손을 떼도 닫지 않는다", () => {
      const { rerender } = render(<Probe {...swipeProps()} />);

      move([200, 100], [200, 260]);
      rerender(<Probe {...swipeProps()} enabled={false} />);
      release();
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("예약된 닫기는 언마운트되면 실행되지 않는다", () => {
      const { unmount } = render(<Probe {...swipeProps()} />);

      drag([200, 100], [200, 260]);
      unmount();
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("닫기 애니메이션 중에는 새 제스처를 받지 않는다", () => {
      render(<Probe {...swipeProps()} />);

      drag([200, 100], [200, 260]);
      // 닫기가 예약된 상태에서 좌우로 끌어도 사진을 넘기지 않는다.
      drag([240, 200], [100, 200]);
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("시작 지점이 허용되지 않으면 닫지 않는다", () => {
      render(<Probe {...swipeProps()} canStart={() => false} />);

      drag([200, 100], [200, 260]);
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("enabled 가 꺼져 있으면 제스처를 받지 않는다", () => {
      render(<Probe {...swipeProps()} enabled={false} />);

      drag([200, 100], [200, 260]);
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("스크림 딤", () => {
    it("드래그 거리만큼 딤을 낮추고 복귀하면 되돌린다", () => {
      render(<Probe {...swipeProps()} withScrim />);

      move([200, 100], [200, 200]);
      expect(screen.getByTestId("scrim").style.opacity).toBe("0.8");

      release();
      expect(screen.getByTestId("scrim").style.opacity).toBe("1");
    });

    it("닫기 커밋 시 스크림을 완전히 걷는다", () => {
      render(<Probe {...swipeProps()} withScrim />);

      drag([200, 100], [200, 260]);

      expect(screen.getByTestId("scrim").style.opacity).toBe("0");
    });

    it("스크림이 없으면 표면만 움직인다", () => {
      render(<Probe {...swipeProps()} />);

      move([200, 100], [200, 200]);

      expect(screen.getByTestId("scrim").style.opacity).toBe("");
      expect(screen.getByTestId("surface").style.opacity).toBe("0.8");
    });
  });

  describe("멀티터치", () => {
    it("닫기 임계치를 넘긴 드래그도 두 번째 손가락이 닿으면 폐기한다", () => {
      render(<Probe {...swipeProps()} />);

      move([200, 100], [200, 260]);
      fireEvent.touchStart(root(), { touches: [point(200, 260), point(240, 260)] });
      release();
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByTestId("surface").style.transform).toBe("translate3d(0, 0, 0)");
    });

    it("touchmove 로만 멀티터치가 관측돼도 드래그를 폐기한다", () => {
      render(<Probe {...swipeProps()} />);

      move([200, 100], [200, 260]);
      fireEvent.touchMove(root(), { touches: [point(200, 260), point(240, 260)] });
      release();
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("좌우 드래그도 두 번째 손가락이 닿으면 폐기하고 원위치한다", () => {
      render(<Probe {...swipeProps()} />);

      move([240, 200], [100, 200]);
      fireEvent.touchStart(root(), { touches: [point(100, 200), point(140, 200)] });
      release();
      settle();

      expect(onSwipe).not.toHaveBeenCalled();
      expect(screen.getByTestId("track").style.transform).toBe("translate3d(0, 0, 0)");
    });

    it("두 손가락으로 시작한 터치는 제스처를 만들지 않는다", () => {
      render(<Probe {...swipeProps()} />);

      fireEvent.touchStart(root(), { touches: [point(100, 200), point(200, 200)] });
      fireEvent.touchMove(root(), { touches: [point(100, 300), point(200, 300)] });
      release();
      settle();

      expect(onDismiss).not.toHaveBeenCalled();
      expect(onSwipe).not.toHaveBeenCalled();
    });
  });

  describe("consumeDragged", () => {
    it("드래그 뒤 합성 click 만 걸러내고 다음 탭은 통과시킨다", () => {
      const onClickResult = vi.fn();
      render(<Probe {...swipeProps()} onClickResult={onClickResult} />);

      drag([240, 200], [100, 200]);
      fireEvent.click(root());
      expect(onClickResult).toHaveBeenLastCalledWith(true);

      fireEvent.click(root());
      expect(onClickResult).toHaveBeenLastCalledWith(false);
    });

    it("움직이지 않은 탭은 걸러내지 않는다", () => {
      const onClickResult = vi.fn();
      render(<Probe {...swipeProps()} onClickResult={onClickResult} />);

      fireEvent.touchStart(root(), { touches: [point(200, 200)] });
      release();
      fireEvent.click(root());

      expect(onClickResult).toHaveBeenLastCalledWith(false);
    });

    it("touchcancel 로 끝난 드래그는 다음 탭을 삼키지 않는다", () => {
      const onClickResult = vi.fn();
      render(<Probe {...swipeProps()} onClickResult={onClickResult} />);

      move([240, 200], [100, 200]);
      fireEvent.touchCancel(root());
      fireEvent.click(root());

      expect(onClickResult).toHaveBeenLastCalledWith(false);
    });
  });
});
