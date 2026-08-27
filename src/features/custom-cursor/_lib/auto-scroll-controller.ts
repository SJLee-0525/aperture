import { autoScrollDirection, autoScrollVelocity } from "@/features/custom-cursor/_lib/auto-scroll";

import type { CursorState } from "@/features/custom-cursor/_lib/cursor-state";

/** 한 프레임에 반영할 최대 경과 시간. 탭이 뒤로 갔다 오면 델타가 커져 화면이 튄다. */
const MAX_STEP_SECONDS = 0.05;

type AutoScrollOptions = {
  cursor: HTMLElement;
  anchor: HTMLElement;
  state: CursorState;
};

/**
 * 가운데 버튼 자동 스크롤.
 *
 * 누른 자리를 기준점으로 잡고 포인터가 그 위나 아래로 얼마나 떨어졌는지에 비례해 속도를
 * 정한다. 스크롤 대상이 화면에서 사라지면 다음 프레임에서 멈춘다.
 */
const createAutoScrollController = ({ cursor, anchor, state }: AutoScrollOptions) => {
  let scroller: HTMLElement | null = null;
  let anchorY = 0;
  let velocity = 0;
  let previousTime = 0;
  let frame = 0;

  const run = (timestamp: number) => {
    frame = 0;
    if (!scroller?.isConnected || velocity === 0) {
      previousTime = timestamp;
      return;
    }

    const elapsed = previousTime
      ? Math.min((timestamp - previousTime) / 1000, MAX_STEP_SECONDS)
      : 0;
    previousTime = timestamp;
    scroller.scrollTop += velocity * elapsed;
    frame = window.requestAnimationFrame(run);
  };

  const schedule = () => {
    if (!frame && scroller && velocity !== 0) frame = window.requestAnimationFrame(run);
  };

  const cancelFrame = () => {
    if (!frame) return;
    window.cancelAnimationFrame(frame);
    frame = 0;
  };

  const stop = () => {
    if (!scroller) return;
    scroller = null;
    velocity = 0;
    previousTime = 0;
    anchor.dataset.visible = "false";
    delete cursor.dataset.scrollDirection;
    cancelFrame();
    state.setAutoScrolling(false);
    state.markTargetDirty();
    state.scheduleDraw();
  };

  return {
    isActive: () => scroller != null,
    start(target: HTMLElement, clientX: number, clientY: number, accentSource: Element | null) {
      scroller = target;
      anchorY = clientY;
      velocity = 0;
      previousTime = 0;
      state.setAutoScrolling(true);
      state.setPointer(clientX, clientY);
      state.setAccent(accentSource);
      state.setSnapped(null);
      state.setVisible(true);
      state.setPressed(false);
      anchor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;
      anchor.dataset.visible = "true";
      cursor.dataset.scrollDirection = "idle";
      state.scheduleDraw();
    },
    stop,
    /** 포인터가 움직일 때마다 기준점과의 거리로 속도를 다시 정한다. */
    updateVelocity(pointerY: number) {
      if (!scroller) return;
      velocity = autoScrollVelocity(pointerY - anchorY);
      cursor.dataset.scrollDirection = autoScrollDirection(velocity);
      if (velocity === 0) {
        cancelFrame();
        previousTime = 0;
      }
      schedule();
    },
    dispose: cancelFrame,
  };
};

export { createAutoScrollController };
