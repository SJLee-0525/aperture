"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

const DIRECTION_LOCK_DISTANCE = 8;
const AXIS_DOMINANCE = 1.15;

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.55;
/** 닫기 애니메이션이 화면을 벗어나는 데 걸리는 시간. */
const DISMISS_DELAY = 170;

const SWIPE_MIN_DISTANCE = 64;
const SWIPE_DISTANCE_RATIO = 0.18;
const SWIPE_FLICK_DISTANCE = 24;
const SWIPE_VELOCITY = 0.45;
const SWIPE_DURATION = 220;
/** transitionend 가 오지 않는 환경에서도 커밋이 남지 않도록 하는 상한. */
const SWIPE_COMMIT_FALLBACK = SWIPE_DURATION + 40;
/** 넘길 수 없는 방향으로 끌 때 남기는 이동 비율. */
const SWIPE_RESISTANCE = 0.25;

const SPRING = "cubic-bezier(0.22, 1, 0.36, 1)";
const RESET_TRANSITION = `transform 240ms ${SPRING}, opacity 180ms ease`;
const DISMISS_TRANSITION = "transform 180ms ease-in, opacity 160ms ease-in";
const SWIPE_TRANSITION = `transform ${SWIPE_DURATION}ms ${SPRING}`;
const SWIPE_RESET_TRANSITION = `transform 240ms ${SPRING}`;

type Direction = "pending" | "vertical" | "horizontal" | "ignored";

/** -1 = 이전, 1 = 다음. */
type SwipeDirection = -1 | 1;

type Options = {
  enabled: boolean;
  onDismiss: () => void;
  surfaceRef: RefObject<HTMLElement | null>;
  canStart?: (target: EventTarget | null) => boolean;
  canSwipeStart?: (target: EventTarget | null) => boolean;
  canSwipeCommit?: (direction: SwipeDirection) => boolean;
  canSwipePeek?: (direction: SwipeDirection) => boolean;
  getSwipeStageWidth?: () => number;
  onSwipe?: (direction: SwipeDirection) => void;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 오버레이의 터치 드래그 — 아래로 끌어 닫기와(선택) 좌우로 넘기기.
 * 두 동작은 한 터치 스트림에서 방향을 하나만 골라야 하므로 인식기를 하나로 둔다.
 * 이동값은 DOM 에 직접 반영해 매 프레임 렌더를 피한다.
 *
 * React 는 touchmove 를 passive 로 등록해 preventDefault 가 무시된다.
 * 브라우저 기본 제스처 억제는 대상 요소의 `touch-action` 이 담당한다.
 *
 * `onSwipe` 를 넘길 때만 좌우 넘기기가 켜진다. 이때 반환된 `swipeSurfaceRef` 를
 * 움직일 요소에 붙인다.
 *
 * @param {Options} options
 * @param {boolean} options.enabled
 * @param {() => void} options.onDismiss
 * @param {RefObject<HTMLElement | null>} options.surfaceRef 아래로 끌 때 움직일 요소.
 * @param {((target: EventTarget | null) => boolean) | undefined} options.canStart
 * @param {((target: EventTarget | null) => boolean) | undefined} options.canSwipeStart
 * @param {((direction: SwipeDirection) => boolean) | undefined} options.canSwipeCommit 넘길 수 없으면 저항만 준다.
 * @param {((direction: SwipeDirection) => boolean) | undefined} options.canSwipePeek 옆 칸이 그려져 있는지. 아니면 애니메이션 없이 넘긴다.
 * @param {(() => number) | undefined} options.getSwipeStageWidth 한 칸 이동 거리. 0 이면 넘기지 않는다.
 * @param {((direction: SwipeDirection) => void) | undefined} options.onSwipe
 * @returns {{ onTouchStart: (event: React.TouchEvent<HTMLElement>) => void; onTouchMove: (event: React.TouchEvent<HTMLElement>) => void; onTouchEnd: () => void; onTouchCancel: () => void; consumeDragged: () => boolean; swipeSurfaceRef: RefObject<HTMLDivElement | null> }}
 */
const useOverlayDrag = ({
  enabled,
  onDismiss,
  surfaceRef,
  canStart,
  canSwipeStart,
  canSwipeCommit,
  canSwipePeek,
  getSwipeStageWidth,
  onSwipe,
}: Options) => {
  const gesture = useRef({
    active: false,
    direction: "pending" as Direction,
    verticalAllowed: false,
    horizontalAllowed: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    distance: 0,
    offset: 0,
  });
  const dragged = useRef(false);
  const pendingCommit = useRef<(() => void) | null>(null);
  const dismissTimer = useRef(0);
  const swipeSurfaceRef = useRef<HTMLDivElement | null>(null);

  const resetSurface = useCallback(
    (animate: boolean) => {
      const surface = surfaceRef.current;
      if (!surface) return;
      surface.style.transition = animate ? RESET_TRANSITION : "none";
      surface.style.transform = "translate3d(0, 0, 0)";
      surface.style.opacity = "1";
    },
    [surfaceRef],
  );

  const resetSwipeSurface = useCallback((animate: boolean) => {
    const surface = swipeSurfaceRef.current;
    if (!surface) return;
    surface.style.transition = animate && !prefersReducedMotion() ? SWIPE_RESET_TRANSITION : "none";
    surface.style.transform = "translate3d(0, 0, 0)";
  }, []);

  const cancelScheduled = useCallback(() => {
    const cancel = pendingCommit.current;
    pendingCommit.current = null;
    cancel?.();
    window.clearTimeout(dismissTimer.current);
    dismissTimer.current = 0;
  }, []);

  // touches[0] 만 따라가는 추적이 핀치를 드래그로 오인한다. 두 번째 손가락이
  // 닿으면 진행 중인 드래그를 버리고 이동값을 원위치해야 손을 떼는 순간
  // 닫히거나 넘어가지 않는다.
  const abortGesture = useCallback(() => {
    const current = gesture.current;
    if (!current.active) return;
    current.active = false;
    current.direction = "pending";
    current.distance = 0;
    current.offset = 0;
    dragged.current = false;
    resetSurface(true);
    resetSwipeSurface(true);
  }, [resetSurface, resetSwipeSurface]);

  // enabled 가 꺼지면(예: EXIF 패널이 펼쳐짐) 진행 중인 제스처까지 함께 버린다.
  // 제스처를 남기면 잠긴 뒤 손을 떼는 순간 닫히거나 넘어간다.
  useEffect(() => {
    if (enabled) return;
    gesture.current.active = false;
    gesture.current.direction = "pending";
    cancelScheduled();
    resetSwipeSurface(false);
  }, [enabled, cancelScheduled, resetSwipeSurface]);

  // 언마운트 뒤 예약이 실행되면 사라진 오버레이의 닫기·이동이 호출된다.
  useEffect(() => cancelScheduled, [cancelScheduled]);

  const scheduleCommit = useCallback((surface: HTMLElement, run: () => void) => {
    let settled = false;
    let timer = 0;

    function onTransitionEnd(event: TransitionEvent) {
      if (event.propertyName !== "transform") return;
      settle();
    }
    const detach = () => {
      surface.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timer);
    };
    function settle() {
      if (settled) return;
      settled = true;
      detach();
      pendingCommit.current = null;
      run();
    }

    surface.addEventListener("transitionend", onTransitionEnd);
    timer = window.setTimeout(settle, SWIPE_COMMIT_FALLBACK);
    pendingCommit.current = () => {
      settled = true;
      detach();
    };
  }, []);

  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      // 합성 click 이 오지 않은 환경에서 플래그가 남아 다음 탭을 삼키지 않도록 먼저 해제한다.
      dragged.current = false;

      if (event.touches.length > 1) {
        abortGesture();
        return;
      }

      const touch = event.touches[0];
      // 전환·닫기 애니메이션이 끝나기 전의 새 제스처는 받지 않는다.
      if (!enabled || !touch || pendingCommit.current || dismissTimer.current) return;

      const verticalAllowed = !canStart || canStart(event.target);
      const horizontalAllowed = onSwipe != null && (!canSwipeStart || canSwipeStart(event.target));
      if (!verticalAllowed && !horizontalAllowed) return;

      gesture.current = {
        active: true,
        direction: "pending",
        verticalAllowed,
        horizontalAllowed,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        distance: 0,
        offset: 0,
      };
    },
    [abortGesture, canStart, canSwipeStart, enabled, onSwipe],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      // 두 번째 손가락이 다른 요소에 내려오면 touchstart 가 이 핸들러를 거치지
      // 않으므로 move 에서도 같은 폐기를 수행한다.
      if (event.touches.length > 1) {
        abortGesture();
        return;
      }

      const current = gesture.current;
      const touch = event.touches[0];
      if (!current.active || !touch) return;

      const dx = touch.clientX - current.startX;
      const dy = touch.clientY - current.startY;

      if (current.direction === "pending") {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (Math.max(ax, ay) < DIRECTION_LOCK_DISTANCE) return;

        if (ax > ay * AXIS_DOMINANCE) {
          current.direction = current.horizontalAllowed ? "horizontal" : "ignored";
        } else if (ay > ax * AXIS_DOMINANCE) {
          // 위로 미는 동작에는 대응하는 기능이 없다.
          current.direction = dy > 0 && current.verticalAllowed ? "vertical" : "ignored";
          if (current.direction === "vertical") resetSurface(false);
        } else {
          // 어느 축도 우세하지 않은 대각선은 더 움직일 때까지 판단을 미룬다.
          return;
        }
      }

      if (current.direction === "vertical") {
        current.distance = Math.max(0, dy);
        const surface = surfaceRef.current;
        if (!surface) return;
        dragged.current = true;
        surface.style.transform = `translate3d(0, ${current.distance}px, 0)`;
        surface.style.opacity = String(Math.max(0.45, 1 - current.distance / 500));
        return;
      }

      if (current.direction !== "horizontal") return;
      const surface = swipeSurfaceRef.current;
      if (!surface) return;

      const direction: SwipeDirection = dx < 0 ? 1 : -1;
      // 넘길 수 없는 방향은 저항을 줘서 끝에 닿았음을 손끝으로 알린다.
      const offset = !canSwipeCommit || canSwipeCommit(direction) ? dx : dx * SWIPE_RESISTANCE;
      current.offset = offset;
      dragged.current = true;
      surface.style.transition = "none";
      surface.style.transform = `translate3d(${offset}px, 0, 0)`;
    },
    [abortGesture, canSwipeCommit, resetSurface, surfaceRef],
  );

  const onTouchEnd = useCallback(() => {
    const current = gesture.current;
    if (!current.active) return;
    current.active = false;
    const elapsed = Math.max(1, performance.now() - current.startTime);

    if (current.direction === "vertical") {
      const velocity = current.distance / elapsed;
      const shouldDismiss =
        current.distance >= DISMISS_DISTANCE ||
        (current.distance >= DIRECTION_LOCK_DISTANCE * 3 && velocity >= DISMISS_VELOCITY);

      if (!shouldDismiss) {
        resetSurface(true);
        return;
      }
      const surface = surfaceRef.current;
      if (surface) {
        surface.style.transition = DISMISS_TRANSITION;
        surface.style.transform = "translate3d(0, 100dvh, 0)";
        surface.style.opacity = "0";
      }
      dismissTimer.current = window.setTimeout(() => {
        dismissTimer.current = 0;
        onDismiss();
      }, DISMISS_DELAY);
      return;
    }

    if (current.direction !== "horizontal") return;
    const surface = swipeSurfaceRef.current;
    if (!surface || !onSwipe) return;

    const direction: SwipeDirection = current.offset < 0 ? 1 : -1;
    const stageWidth = getSwipeStageWidth ? getSwipeStageWidth() : 0;
    const travel = Math.abs(current.offset);
    const velocity = travel / elapsed;
    const threshold = Math.max(SWIPE_MIN_DISTANCE, stageWidth * SWIPE_DISTANCE_RATIO);
    // 폭을 못 재면 이동 거리가 0 인 전환이 되므로 넘기지 않는다.
    const shouldCommit =
      stageWidth > 0 &&
      (!canSwipeCommit || canSwipeCommit(direction)) &&
      (travel >= threshold || (travel >= SWIPE_FLICK_DISTANCE && velocity >= SWIPE_VELOCITY));

    if (!shouldCommit) {
      resetSwipeSurface(true);
      return;
    }

    // 옆 칸이 아직 그려지지 않았으면 빈 화면을 밀어 보여 주는 대신 곧바로 넘긴다.
    if (prefersReducedMotion() || (canSwipePeek && !canSwipePeek(direction))) {
      resetSwipeSurface(false);
      onSwipe(direction);
      return;
    }
    const landing = direction === 1 ? -stageWidth : stageWidth;
    surface.style.transition = SWIPE_TRANSITION;
    surface.style.transform = `translate3d(${landing}px, 0, 0)`;
    scheduleCommit(surface, () => onSwipe(direction));
  }, [
    canSwipeCommit,
    canSwipePeek,
    getSwipeStageWidth,
    onDismiss,
    onSwipe,
    resetSurface,
    resetSwipeSurface,
    scheduleCommit,
    surfaceRef,
  ]);

  const onTouchCancel = useCallback(() => {
    const current = gesture.current;
    current.active = false;
    current.direction = "pending";
    current.distance = 0;
    current.offset = 0;
    dragged.current = false;
    cancelScheduled();
    resetSurface(true);
    resetSwipeSurface(true);
  }, [cancelScheduled, resetSurface, resetSwipeSurface]);

  /**
   * 직전 제스처가 실제로 움직였는지 한 번만 알려 준다.
   * 드래그 뒤 브라우저가 합성하는 click 을 걸러내는 용도이며, 읽는 즉시 해제된다.
   */
  const consumeDragged = useCallback(() => {
    const value = dragged.current;
    dragged.current = false;
    return value;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, consumeDragged, swipeSurfaceRef };
};

export { useOverlayDrag };
export type { SwipeDirection };
