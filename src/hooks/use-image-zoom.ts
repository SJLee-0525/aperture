"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const MAX_SCALE_DEFAULT = 3;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 24;
const TAP_MOVE_TOLERANCE = 10;
/** touch 더블탭 뒤 브라우저가 합성하는 dblclick 이 줌을 한 번 더 토글하지 않게 하는 창. */
const DBLCLICK_SUPPRESS_MS = 500;
const WHEEL_ZOOM_INTENSITY = 0.002;
/** deltaMode 가 line 인 휠(파이어폭스)의 픽셀 환산 계수. */
const WHEEL_LINE_HEIGHT = 16;
/** 배율 한계 밖으로 끌 때 남기는 반영 비율. 끝에 닿았음을 손끝으로 알린다. */
const PINCH_OVERSHOOT = 0.15;
/** 부동소수점 오차 위에서 줌 여부를 판정하는 하한. */
const ZOOM_EPSILON = 1.001;
const SPRING = "cubic-bezier(0.22, 1, 0.36, 1)";
const ZOOM_TRANSITION = `transform 240ms ${SPRING}`;

type Point = { x: number; y: number };

type Transform = { scale: number; tx: number; ty: number };

type Gesture =
  | { mode: "idle" }
  | { mode: "pinch"; startDistance: number; startMid: Point; start: Transform }
  | { mode: "touch-pan"; startX: number; startY: number; start: Transform }
  | { mode: "mouse-pan" };

type Options = {
  enabled: boolean;
  resetKey: string;
  getMaxScale?: (stage: HTMLElement) => number;
  onZoomChange?: (zoomed: boolean) => void;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clampOffset = (value: number, size: number, scale: number) => {
  const limit = Math.max(0, (size * (scale - 1)) / 2);
  return Math.min(limit, Math.max(-limit, value));
};

const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 이미지 표면의 자체줌 — 핀치·더블탭·휠 확대와 확대 중 팬.
 * 이동값은 DOM 에 직접 반영하고 React state 는 줌 경계(`zoomed`)만 갱신한다.
 *
 * 이벤트는 네이티브 non-passive 리스너로 부착한다. React 는 touchmove 를 passive 로
 * 등록해 preventDefault 가 무시되고, iOS Safari 는 touch-action 과 별개로
 * gesturestart 를 취소해야 페이지 줌이 개입하지 않는다.
 *
 * 계약:
 * - `stageRef` 는 비변환 부모를 100% 채우는 요소에 붙인다. 팬 경계와 초점 좌표가
 *   부모의 레이아웃 크기를 기준으로 계산된다.
 * - `stageRef` 가 다른 DOM 노드로 옮겨 붙는 일은 반드시 `resetKey` 변경과 동반된다.
 *   리스너 재바인딩이 `resetKey` 를 신호로 삼는다.
 * - `enabled` 가 꺼지면(하위 레이어로 내려가면) 즉시 배율 1 로 리셋된다.
 *
 * @param options.getMaxScale 최대 배율. 표면 노드를 받아 이미지 해상도 대비로 계산할 수 있다. 기본 3.
 * @param options.onZoomChange 줌 경계 전환시만 호출.
 */
const useImageZoom = ({ enabled, resetKey, getMaxScale, onZoomChange }: Options) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);

  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 });
  const gestureRef = useRef<Gesture>({ mode: "idle" });
  const zoomedRef = useRef(false);
  /** 직전 터치 스트림이 탭 허용 오차를 넘어 움직였는지. 합성 click 억제에 쓴다. */
  const movedRef = useRef(false);
  const tapCandidateRef = useRef<Point | null>(null);
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const singleTapTimerRef = useRef(0);
  const dblclickSuppressUntilRef = useRef(0);
  const windowCleanupRef = useRef<(() => void) | null>(null);

  // 리스너 effect 를 다시 뛰게 하지 않으면서 항상 최신 콜백을 호출한다.
  const latestRef = useRef({ getMaxScale, onZoomChange });
  useLayoutEffect(() => {
    latestRef.current = { getMaxScale, onZoomChange };
  });

  const readMaxScale = useCallback(() => {
    const node = stageRef.current;
    // `||` 는 0 과 NaN 을 기본값으로 바꿔 버려 아래 유한성 검사가 무한대만 잡게 된다.
    // 이미지 dimension 이 0 인 데이터에서 배율이 조용히 3 이 되는 것을 막는다.
    const raw = node ? latestRef.current.getMaxScale?.(node) : undefined;
    return typeof raw === "number" && Number.isFinite(raw)
      ? Math.max(1, raw)
      : MAX_SCALE_DEFAULT;
  }, []);

  const clearPendingSingleTap = useCallback(() => {
    window.clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = 0;
  }, []);

  const removeWindowListeners = useCallback(() => {
    windowCleanupRef.current?.();
  }, []);

  const syncZoomed = useCallback(() => {
    const next = transformRef.current.scale > ZOOM_EPSILON;
    const node = stageRef.current;
    if (node && gestureRef.current.mode !== "mouse-pan") node.style.cursor = next ? "grab" : "";
    if (next === zoomedRef.current) return;
    zoomedRef.current = next;
    setZoomed(next);
    latestRef.current.onZoomChange?.(next);
  }, []);

  /**
   * 표면과 그 부모의 치수. 제스처 한 번 동안은 바뀌지 않는다.
   *
   * 직전 프레임의 `style.transform` 쓰기가 레이아웃을 무효화한 상태에서 다음 프레임이
   * `offsetWidth` 를 읽으면 강제 동기 레이아웃이 프레임마다 일어난다. 제스처 시작에 한 번
   * 재고 그 뒤로는 캐시를 쓴다.
   */
  const metricsRef = useRef<{ width: number; height: number; rect: DOMRect } | null>(null);

  const invalidateMetrics = useCallback(() => {
    metricsRef.current = null;
  }, []);

  const readMetrics = useCallback(() => {
    const cached = metricsRef.current;
    if (cached) return cached;
    const node = stageRef.current;
    const parent = node?.parentElement;
    if (!node || !parent) return null;
    const next = {
      width: node.offsetWidth,
      height: node.offsetHeight,
      rect: parent.getBoundingClientRect(),
    };
    metricsRef.current = next;
    return next;
  }, []);

  /** 오프셋을 표면 크기 기준으로 클램프해 적용한다. transition 은 여기서만 결정된다. */
  const commitTransform = useCallback(
    (scale: number, tx: number, ty: number, animate: boolean) => {
      const node = stageRef.current;
      const metrics = readMetrics();
      if (!node || !metrics) return;
      const next: Transform = {
        scale,
        tx: clampOffset(tx, metrics.width, scale),
        ty: clampOffset(ty, metrics.height, scale),
      };
      transformRef.current = next;
      node.style.transition = animate && !prefersReducedMotion() ? ZOOM_TRANSITION : "none";
      node.style.transform = `translate3d(${next.tx}px, ${next.ty}px, 0) scale(${next.scale})`;
      syncZoomed();
    },
    [readMetrics, syncZoomed],
  );

  /** 초점 f 아래에 있는 표면 점을 고정한 채 배율만 바꾼다. */
  const zoomAround = useCallback(
    (scale: number, focal: Point, animate: boolean) => {
      const current = transformRef.current;
      const ratio = scale / current.scale;
      commitTransform(
        scale,
        focal.x - (focal.x - current.tx) * ratio,
        focal.y - (focal.y - current.ty) * ratio,
        animate,
      );
    },
    [commitTransform],
  );

  /** 포인터 클라이언트 좌표를 비변환 부모 중심 기준 오프셋으로 바꾼다. */
  const toLocalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const metrics = readMetrics();
      if (!metrics) return null;
      const { rect } = metrics;
      return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    },
    [readMetrics],
  );

  const resetInternal = useCallback(
    (animate: boolean) => {
      gestureRef.current = { mode: "idle" };
      tapCandidateRef.current = null;
      lastTapRef.current = null;
      clearPendingSingleTap();
      removeWindowListeners();
      transformRef.current = { scale: 1, tx: 0, ty: 0 };
      const node = stageRef.current;
      if (node) {
        node.style.transition = animate && !prefersReducedMotion() ? ZOOM_TRANSITION : "none";
        node.style.transform = "translate3d(0px, 0px, 0) scale(1)";
        node.style.willChange = "";
      }
      syncZoomed();
    },
    [clearPendingSingleTap, removeWindowListeners, syncZoomed],
  );

  const reset = useCallback((animate = true) => resetInternal(animate), [resetInternal]);

  const toggleZoomAt = useCallback(
    (clientX: number, clientY: number) => {
      if (transformRef.current.scale > ZOOM_EPSILON) {
        resetInternal(true);
        return;
      }
      const focal = toLocalPoint(clientX, clientY);
      if (!focal) return;
      const node = stageRef.current;
      if (node) node.style.willChange = "transform";
      zoomAround(Math.min(DOUBLE_TAP_SCALE, readMaxScale()), focal, true);
    },
    [readMaxScale, resetInternal, toLocalPoint, zoomAround],
  );

  /**
   * 표면 click 을 단일탭과 더블탭으로 가른다. 단일탭 동작은 더블탭 대기 시간만큼
   * 보류했다가 실행한다. 곧바로 실행하면 더블탭 확대 때 크롬 토글이 한 번 새어 나간다.
   */
  const handleStageClick = useCallback(
    (onSingleTap: () => void) => {
      // 줌이 꺼져 있으면 더블탭 판정이 무의미하다. 보류하면 단일탭이 늦어지고
      // 빠른 두 탭은 서로를 취소해 동작이 사라진다.
      if (!enabled) {
        clearPendingSingleTap();
        movedRef.current = false;
        onSingleTap();
        return;
      }
      if (movedRef.current) {
        movedRef.current = false;
        return;
      }
      // 보류 중에 다시 온 click 은 더블탭의 두 번째 click 이다. 토글은 touchend
      // 또는 dblclick 경로가 수행하므로 보류만 취소한다.
      if (singleTapTimerRef.current) {
        clearPendingSingleTap();
        return;
      }
      singleTapTimerRef.current = window.setTimeout(() => {
        singleTapTimerRef.current = 0;
        onSingleTap();
      }, DOUBLE_TAP_MS);
    },
    [clearPendingSingleTap, enabled],
  );

  // 리스너 effect 는 enabled 일 때만 cleanup 을 등록한다. 어떤 경로로 보류가
  // 남더라도 언마운트 뒤 콜백이 실행되지 않게 별도로 정리한다.
  useEffect(() => clearPendingSingleTap, [clearPendingSingleTap]);

  // enabled 해제와 슬라이드 전환은 페인트 전에 배율 1 을 확정한다. 남은 transform 이
  // 새 슬라이드의 첫 프레임에 나타나지 않아야 한다.
  useLayoutEffect(() => {
    invalidateMetrics();
    resetInternal(false);
  }, [enabled, invalidateMetrics, resetKey, resetInternal]);

  useEffect(() => {
    window.addEventListener("resize", invalidateMetrics);
    return () => window.removeEventListener("resize", invalidateMetrics);
  }, [invalidateMetrics]);

  useEffect(() => {
    const node = stageRef.current;
    if (!enabled || !node) return;

    const ensureWillChange = () => {
      node.style.willChange = "transform";
    };


    const onTouchStart = (event: TouchEvent) => {
      // 제스처 사이에 모달 레이아웃이 바뀔 수 있다(모바일 EXIF 패널 펼침). 시작마다 다시 잰다.
      invalidateMetrics();
      const [first, second] = [event.touches[0], event.touches[1]];
      if (first && second) {
        // 브라우저 페이지 핀치줌이 시작되기 전에 터치를 가로챈다.
        event.preventDefault();
        clearPendingSingleTap();
        tapCandidateRef.current = null;
        lastTapRef.current = null;
        movedRef.current = true;
        const startMid = toLocalPoint(
          (first.clientX + second.clientX) / 2,
          (first.clientY + second.clientY) / 2,
        );
        if (!startMid) return;
        ensureWillChange();
        gestureRef.current = {
          mode: "pinch",
          startDistance: Math.max(
            1,
            Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
          ),
          startMid,
          start: { ...transformRef.current },
        };
        return;
      }
      if (!first) return;
      movedRef.current = false;
      tapCandidateRef.current = { x: first.clientX, y: first.clientY };
      if (transformRef.current.scale > ZOOM_EPSILON) {
        // preventDefault 는 하지 않는다. 합성 click 이 살아 있어야 확대 상태의
        // 단일탭·더블탭 판정이 이어진다.
        ensureWillChange();
        gestureRef.current = {
          mode: "touch-pan",
          startX: first.clientX,
          startY: first.clientY,
          start: { ...transformRef.current },
        };
      } else {
        gestureRef.current = { mode: "idle" };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      if (gesture.mode === "pinch") {
        const [first, second] = [event.touches[0], event.touches[1]];
        if (!first || !second) return;
        event.preventDefault();
        const mid = toLocalPoint(
          (first.clientX + second.clientX) / 2,
          (first.clientY + second.clientY) / 2,
        );
        if (!mid) return;
        const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
        const raw = gesture.start.scale * (distance / gesture.startDistance);
        const max = readMaxScale();
        const scale =
          raw > max
            ? max + (raw - max) * PINCH_OVERSHOOT
            : raw < 1
              ? 1 - (1 - raw) * PINCH_OVERSHOOT
              : raw;
        const ratio = scale / gesture.start.scale;
        // 중점 이동분이 그대로 팬이 된다. 핀치와 팬을 한 식으로 처리한다.
        commitTransform(
          scale,
          mid.x - (gesture.startMid.x - gesture.start.tx) * ratio,
          mid.y - (gesture.startMid.y - gesture.start.ty) * ratio,
          false,
        );
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;
      const candidate = tapCandidateRef.current;
      if (
        candidate &&
        Math.hypot(touch.clientX - candidate.x, touch.clientY - candidate.y) > TAP_MOVE_TOLERANCE
      ) {
        movedRef.current = true;
      }
      if (gesture.mode === "touch-pan") {
        event.preventDefault();
        commitTransform(
          transformRef.current.scale,
          gesture.start.tx + (touch.clientX - gesture.startX),
          gesture.start.ty + (touch.clientY - gesture.startY),
          false,
        );
        return;
      }
      // 확대 상태에서는 어떤 한 손가락 이동도 트랙 스크롤·스와이프로 새지 않는다.
      if (transformRef.current.scale > ZOOM_EPSILON) event.preventDefault();
    };

    const settlePinch = () => {
      const current = transformRef.current;
      const max = readMaxScale();
      if (current.scale <= ZOOM_EPSILON) {
        resetInternal(true);
        return;
      }
      if (current.scale > max) {
        // 초점 없이 배율만 되돌리면 화면 중심이 흔들린다. 컨테이너 중심 기준으로 수렴시킨다.
        const ratio = max / current.scale;
        commitTransform(max, current.tx * ratio, current.ty * ratio, true);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      if (gesture.mode === "pinch") {
        if (event.touches.length >= 2) return;
        settlePinch();
        const remaining = event.touches[0];
        if (remaining && transformRef.current.scale > ZOOM_EPSILON) {
          gestureRef.current = {
            mode: "touch-pan",
            startX: remaining.clientX,
            startY: remaining.clientY,
            start: { ...transformRef.current },
          };
        } else {
          gestureRef.current = { mode: "idle" };
        }
        return;
      }

      if (event.touches.length > 0) return;
      gestureRef.current = { mode: "idle" };
      const candidate = tapCandidateRef.current;
      tapCandidateRef.current = null;
      if (!candidate || movedRef.current) return;

      const now = performance.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.time < DOUBLE_TAP_MS &&
        distanceBetween(candidate, last.point) < DOUBLE_TAP_DISTANCE
      ) {
        lastTapRef.current = null;
        clearPendingSingleTap();
        dblclickSuppressUntilRef.current = now + DBLCLICK_SUPPRESS_MS;
        // 두 번째 합성 click 이 단일탭 보류를 다시 시작하지 않게 한다.
        movedRef.current = true;
        toggleZoomAt(candidate.x, candidate.y);
        return;
      }
      lastTapRef.current = { time: now, point: candidate };
    };

    const onTouchCancel = () => {
      gestureRef.current = { mode: "idle" };
      tapCandidateRef.current = null;
      removeWindowListeners();
      settlePinch();
    };

    const onWheel = (event: WheelEvent) => {
      invalidateMetrics();
      // 스크롤이 잠긴 오버레이라 표면 위 휠은 줌 전용이다.
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * WHEEL_LINE_HEIGHT : event.deltaY;
      const current = transformRef.current;
      const scale = Math.min(
        readMaxScale(),
        Math.max(1, current.scale * Math.exp(-delta * WHEEL_ZOOM_INTENSITY)),
      );
      if (scale === current.scale) return;
      const focal = toLocalPoint(event.clientX, event.clientY);
      if (!focal) return;
      ensureWillChange();
      zoomAround(scale, focal, false);
    };

    const onMouseDown = (event: MouseEvent) => {
      invalidateMetrics();
      if (event.button !== 0 || transformRef.current.scale <= ZOOM_EPSILON) return;
      // 창 밖에서 버튼을 놓아 mouseup 이 유실되면 직전 팬의 리스너가 window 에 남는다.
      // 새 리스너를 얹기 전에 걷어내지 않으면 두 클로저가 각자의 시작점으로
      // commitTransform 을 불러 이미지가 두 위치 사이를 오간다.
      removeWindowListeners();
      // 이미지 드래그·텍스트 선택 대신 팬을 시작한다.
      event.preventDefault();
      const start = { ...transformRef.current };
      const startX = event.clientX;
      const startY = event.clientY;
      gestureRef.current = { mode: "mouse-pan" };
      node.style.cursor = "grabbing";

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (
          Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > TAP_MOVE_TOLERANCE
        ) {
          movedRef.current = true;
        }
        commitTransform(
          start.scale,
          start.tx + (moveEvent.clientX - startX),
          start.ty + (moveEvent.clientY - startY),
          false,
        );
      };
      const onMouseUp = () => {
        removeWindowListeners();
        gestureRef.current = { mode: "idle" };
        node.style.cursor = zoomedRef.current ? "grab" : "";
      };

      windowCleanupRef.current = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        windowCleanupRef.current = null;
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    const onDblClick = (event: MouseEvent) => {
      event.preventDefault();
      if (performance.now() < dblclickSuppressUntilRef.current) return;
      toggleZoomAt(event.clientX, event.clientY);
    };

    const preventGesture = (event: Event) => event.preventDefault();

    const options: AddEventListenerOptions = { passive: false };
    node.addEventListener("touchstart", onTouchStart, options);
    node.addEventListener("touchmove", onTouchMove, options);
    node.addEventListener("touchend", onTouchEnd, options);
    node.addEventListener("touchcancel", onTouchCancel, options);
    node.addEventListener("wheel", onWheel, options);
    node.addEventListener("mousedown", onMouseDown, options);
    node.addEventListener("dblclick", onDblClick, options);
    node.addEventListener("gesturestart", preventGesture, options);
    node.addEventListener("gesturechange", preventGesture, options);

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("mousedown", onMouseDown);
      node.removeEventListener("dblclick", onDblClick);
      node.removeEventListener("gesturestart", preventGesture);
      node.removeEventListener("gesturechange", preventGesture);
      clearPendingSingleTap();
      removeWindowListeners();
      gestureRef.current = { mode: "idle" };
      // 옮겨 붙기 전의 노드에 인라인 스타일을 남기지 않는다.
      node.style.transform = "";
      node.style.transition = "";
      node.style.cursor = "";
      node.style.willChange = "";
    };
  }, [
    clearPendingSingleTap,
    commitTransform,
    enabled,
    invalidateMetrics,
    readMaxScale,
    removeWindowListeners,
    resetInternal,
    resetKey,
    toLocalPoint,
    toggleZoomAt,
    zoomAround,
  ]);

  return { stageRef, zoomed, reset, handleStageClick };
};

export { useImageZoom };
