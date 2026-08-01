"use client";

import { useCallback, useRef, type RefObject } from "react";

const DIRECTION_LOCK_DISTANCE = 8;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.55;

type Options = {
  enabled: boolean;
  onDismiss: () => void;
  surfaceRef: RefObject<HTMLElement | null>;
  canStart?: (target: EventTarget | null) => boolean;
};

/** 모바일에서 아래로 끌어 닫는 제스처. 이동값은 DOM에 직접 반영해 매 프레임 렌더를 피한다. */
const usePullDownDismiss = ({ enabled, onDismiss, surfaceRef, canStart }: Options) => {
  const gesture = useRef({
    active: false,
    direction: "pending" as "pending" | "vertical" | "horizontal",
    startX: 0,
    startY: 0,
    startTime: 0,
    distance: 0,
  });

  const resetSurface = useCallback(
    (animate: boolean) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      surface.style.transition = animate
        ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease"
        : "none";
      surface.style.transform = "translate3d(0, 0, 0)";
      surface.style.opacity = "1";
    },
    [surfaceRef],
  );

  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const touch = event.touches[0];
      if (!enabled || !touch || (canStart && !canStart(event.target))) return;
      gesture.current = {
        active: true,
        direction: "pending",
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        distance: 0,
      };
    },
    [canStart, enabled],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const current = gesture.current;
      const touch = event.touches[0];
      if (!current.active || !touch) return;

      const dx = touch.clientX - current.startX;
      const dy = touch.clientY - current.startY;
      if (
        current.direction === "pending" &&
        Math.max(Math.abs(dx), Math.abs(dy)) >= DIRECTION_LOCK_DISTANCE
      ) {
        current.direction =
          dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.15 ? "vertical" : "horizontal";
        if (current.direction === "vertical") resetSurface(false);
      }
      if (current.direction !== "vertical") return;

      event.preventDefault();
      current.distance = Math.max(0, dy);
      const surface = surfaceRef.current;
      if (!surface) return;
      surface.style.transform = `translate3d(0, ${current.distance}px, 0)`;
      surface.style.opacity = String(Math.max(0.45, 1 - current.distance / 500));
    },
    [resetSurface, surfaceRef],
  );

  const finish = useCallback(() => {
    const current = gesture.current;
    if (!current.active) return;
    current.active = false;
    if (current.direction !== "vertical") return;
    const elapsed = Math.max(1, performance.now() - current.startTime);
    const velocity = current.distance / elapsed;
    const shouldDismiss =
      current.direction === "vertical" &&
      (current.distance >= DISMISS_DISTANCE ||
        (current.distance >= DIRECTION_LOCK_DISTANCE * 3 && velocity >= DISMISS_VELOCITY));

    if (shouldDismiss) {
      const surface = surfaceRef.current;
      if (surface) {
        surface.style.transition = "transform 180ms ease-in, opacity 160ms ease-in";
        surface.style.transform = "translate3d(0, 100dvh, 0)";
        surface.style.opacity = "0";
      }
      window.setTimeout(onDismiss, 170);
      return;
    }
    resetSurface(true);
  }, [onDismiss, resetSurface, surfaceRef]);

  return { onTouchStart, onTouchMove, onTouchEnd: finish, onTouchCancel: finish };
};

export { usePullDownDismiss };
