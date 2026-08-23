"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { autoScrollDirection, autoScrollVelocity } from "@/features/custom-cursor/_lib/auto-scroll";
import {
  applyCursorGeometry,
  type CursorMode,
  type ScrollbarAxis,
} from "@/features/custom-cursor/_lib/cursor-mode";
import { resolveCursorTarget } from "@/features/custom-cursor/_lib/cursor-target";

import { stripLangPrefix } from "@/lib/i18n/locale-path";

import {
  CUSTOM_CURSOR_LOADING_EVENT,
  CUSTOM_CURSOR_MAP_HOVER_EVENT,
  setCursorLoading,
  type CursorLoadingDetail,
} from "@/utils/custom-cursor-events";

import styles from "./CustomCursor.module.css";

const ENABLE_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const AUTO_SCROLL_EXCLUDED_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="dialog"]',
  "[data-autoscroll-disabled]",
  ".maplibregl-map",
].join(", ");
const SECTION_ACCENTS: Record<string, string> = {
  photo: "var(--accent-photo)",
  music: "var(--accent-music)",
  dev: "var(--accent-dev)",
  contact: "var(--accent-contact)",
  legal: "var(--accent-photo)",
};
const LANDING_CURSOR_ACCENT = "var(--cursor-landing-accent)";
const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

const findVerticalScroller = (eventTarget: EventTarget | null): HTMLElement | null => {
  let element = eventTarget instanceof HTMLElement ? eventTarget : null;

  while (element && element !== document.body && element !== document.documentElement) {
    const overflowY = getComputedStyle(element).overflowY;
    if (SCROLLABLE_OVERFLOW.has(overflowY) && element.scrollHeight > element.clientHeight + 1) {
      return element;
    }
    element = element.parentElement;
  }

  const scroller = document.scrollingElement ?? document.documentElement;
  const rootOverflowY = getComputedStyle(document.documentElement).overflowY;
  const bodyOverflowY = getComputedStyle(document.body).overflowY;
  if (
    !(scroller instanceof HTMLElement) ||
    rootOverflowY === "hidden" ||
    rootOverflowY === "clip" ||
    bodyOverflowY === "hidden" ||
    bodyOverflowY === "clip" ||
    scroller.scrollHeight <= scroller.clientHeight + 1
  ) {
    return null;
  }

  return scroller;
};

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const autoScrollAnchorRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // 아래 효과는 포인터 좌표를 클로저 지역 변수로 들고 있다. 경로를 의존성에 넣으면 이동마다
  // 효과가 다시 실행돼 좌표가 0,0 으로 초기화되고, 직후의 스크롤 이벤트가 커서를 좌상단에 그린다.
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
    setCursorLoading("route", false);
  }, [pathname]);

  useEffect(() => {
    const cursor = cursorRef.current;
    const autoScrollAnchor = autoScrollAnchorRef.current;
    if (!cursor || !autoScrollAnchor) return;

    const root = document.documentElement;
    const media = window.matchMedia(ENABLE_QUERY);
    let pointerX = 0;
    let pointerY = 0;
    let target: HTMLElement | null = null;
    let targetRect: DOMRect | null = null;
    let targetCircular = false;
    let targetPill = false;
    let targetCompact = false;
    let targetLargeMode: "frame" | "link" = "link";
    let targetDirty = false;
    let snapped: HTMLElement | null = null;
    let currentAccent = "";
    let currentMode = "";
    let visible = false;
    let pressed = false;
    let mapTargetHovered = false;
    let textTargetHovered = false;
    let rangeTargetHovered = false;
    let customScrollbarTargetHovered = false;
    let scrollbarAxis: ScrollbarAxis = "vertical";
    let scrolling = false;
    let loading = false;
    const loadingIds = new Set<string>();
    let loadingDelayTimer = 0;
    let loadingSafetyTimer = 0;
    let scrollEndTimer = 0;
    let frameExitTimer = 0;
    let frame = 0;
    let autoScrollFrame = 0;
    let autoScrollTarget: HTMLElement | null = null;
    let autoScrollAnchorY = 0;
    let autoScrollVelocityY = 0;
    let autoScrollPreviousTime = 0;
    let suppressNextClick = false;
    let suppressNextAuxClick = false;

    const setVisible = (next: boolean) => {
      if (next === visible) return;
      visible = next;
      cursor.dataset.visible = String(next);
    };

    const setPressed = (next: boolean) => {
      if (next === pressed) return;
      pressed = next;
      cursor.dataset.pressed = String(next);
    };

    // 대기 표시는 모드와 따로 둔다. `draw` 는 스냅된 대상이 있으면 먼저 반환하는데,
    // 링크를 클릭한 직후가 바로 그 상태라 모드에만 기대면 이동 중 표시가 나오지 않는다.
    const setLoading = (next: boolean) => {
      if (next === loading) return;
      loading = next;
      cursor.dataset.loading = String(next);
      scheduleDraw();
    };

    // 스냅된 요소에만 마킹 — 각 컴포넌트의 배경형 :hover가 :not([data-cursor-snapped])로
    // 자신을 끄게 해서 커서 면칠과 기초 호버 배경이 겹치지 않게 한다.
    const setSnapped = (next: HTMLElement | null) => {
      if (next === snapped) return;
      if (snapped) delete snapped.dataset.cursorSnapped;
      snapped = next;
      if (snapped) snapped.dataset.cursorSnapped = "true";
    };

    const setMode = (next: CursorMode) => {
      if (next === currentMode) return;

      window.clearTimeout(frameExitTimer);
      if (currentMode === "frame" && next !== "frame") {
        cursor.dataset.frameExit = "true";
        frameExitTimer = window.setTimeout(() => {
          delete cursor.dataset.frameExit;
        }, 32);
      } else if (next === "frame") {
        delete cursor.dataset.frameExit;
      }

      currentMode = next;
      cursor.dataset.mode = next;

      applyCursorGeometry(cursor, next, scrollbarAxis);
    };

    const setAccent = (element: Element | null) => {
      const section = element?.closest<HTMLElement>("[data-section]")?.dataset.section;
      // 랜딩의 빈 영역은 중립색으로 두되, 섹션 진입 행에서는 각 섹션의 accent를 미리 보여준다.
      // --text를 사용해 라이트에서는 차콜, 다크에서는 밝은 무채색으로 대비를 유지한다.
      const accent =
        SECTION_ACCENTS[section ?? ""] ??
        (stripLangPrefix(pathnameRef.current) === "/" ? LANDING_CURSOR_ACCENT : "var(--accent)");
      if (accent === currentAccent) return;
      currentAccent = accent;
      cursor.style.setProperty("--cursor-accent", accent);
      autoScrollAnchor.style.setProperty("--cursor-accent", accent);
    };

    const stopAutoScroll = () => {
      if (!autoScrollTarget) return;
      autoScrollTarget = null;
      autoScrollVelocityY = 0;
      autoScrollPreviousTime = 0;
      autoScrollAnchor.dataset.visible = "false";
      delete cursor.dataset.scrollDirection;
      if (autoScrollFrame) {
        window.cancelAnimationFrame(autoScrollFrame);
        autoScrollFrame = 0;
      }
      if (target) targetDirty = true;
      scheduleDraw();
    };

    const runAutoScroll = (timestamp: number) => {
      autoScrollFrame = 0;
      if (!autoScrollTarget?.isConnected || autoScrollVelocityY === 0) {
        autoScrollPreviousTime = timestamp;
        return;
      }

      const elapsed = autoScrollPreviousTime
        ? Math.min((timestamp - autoScrollPreviousTime) / 1000, 0.05)
        : 0;
      autoScrollPreviousTime = timestamp;
      autoScrollTarget.scrollTop += autoScrollVelocityY * elapsed;
      autoScrollFrame = window.requestAnimationFrame(runAutoScroll);
    };

    const scheduleAutoScroll = () => {
      if (!autoScrollFrame && autoScrollTarget && autoScrollVelocityY !== 0) {
        autoScrollFrame = window.requestAnimationFrame(runAutoScroll);
      }
    };

    const updateAutoScrollVelocity = () => {
      if (!autoScrollTarget) return;
      autoScrollVelocityY = autoScrollVelocity(pointerY - autoScrollAnchorY);
      cursor.dataset.scrollDirection = autoScrollDirection(autoScrollVelocityY);
      if (autoScrollVelocityY === 0 && autoScrollFrame) {
        window.cancelAnimationFrame(autoScrollFrame);
        autoScrollFrame = 0;
        autoScrollPreviousTime = 0;
      }
      scheduleAutoScroll();
    };

    const measureTarget = () => {
      targetDirty = false;
      if (!target?.isConnected) {
        target = null;
        targetRect = null;
        targetCompact = false;
        return;
      }

      targetRect = target.getBoundingClientRect();
      targetCompact = targetRect.width <= 450 && targetRect.height <= 128;
      targetLargeMode = target.dataset.cursorLarge === "frame" ? "frame" : "link";
      if (!targetCompact) return;

      targetPill = target.dataset.cursorShape === "pill";
      const targetRadius = Number.parseFloat(getComputedStyle(target).borderRadius) || 0;
      targetCircular =
        Math.abs(targetRect.width - targetRect.height) <= 4 &&
        targetRadius >= Math.min(targetRect.width, targetRect.height) / 2 - 2;
    };

    /**
     * 대기 표식을 커서 요소 원점이 아니라 포인터 위에 둔다.
     * 스냅·프레임 모드는 요소를 대상의 중심으로 옮기므로, 보정하지 않으면 표식이 카드
     * 한가운데에서 돌아 포인터와 떨어진다.
     */
    const setLoadingOffset = (offsetX: number, offsetY: number) => {
      cursor.style.setProperty("--cursor-loading-x", `${offsetX}px`);
      cursor.style.setProperty("--cursor-loading-y", `${offsetY}px`);
    };

    const draw = () => {
      frame = 0;
      if (!media.matches) return;

      if (targetDirty) measureTarget();
      // 그 밖의 모드는 요소가 포인터 위에 있어 보정이 필요 없다.
      if (loading) setLoadingOffset(0, 0);

      if (autoScrollTarget) {
        setSnapped(null);
        setMode("autoscroll");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (scrolling) {
        setSnapped(null);
        setMode("scroll");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (mapTargetHovered) {
        setSnapped(null);
        setMode("ring");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (textTargetHovered) {
        setSnapped(null);
        setMode("text");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (rangeTargetHovered) {
        setSnapped(null);
        setMode("range");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (customScrollbarTargetHovered) {
        setSnapped(null);
        setMode("scrollbar");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (target && targetRect) {
        if (targetCompact) {
          const expansion = 5.5;
          const size = Math.max(targetRect.width, targetRect.height) + expansion;
          const localX = Math.min(Math.max(pointerX - targetRect.left, 0), targetRect.width);
          const localY = Math.min(Math.max(pointerY - targetRect.top, 0), targetRect.height);
          const hintX = targetRect.width ? (localX / targetRect.width) * 100 : 50;
          const hintY = targetRect.height ? (localY / targetRect.height) * 100 : 50;

          const centerX = targetRect.left + targetRect.width / 2;
          const centerY = targetRect.top + targetRect.height / 2;

          setSnapped(target);
          setMode("snap");
          if (loading) setLoadingOffset(pointerX - centerX, pointerY - centerY);
          cursor.style.transform = `translate3d(${centerX}px, ${centerY}px, 0)`;
          cursor.style.setProperty(
            "--cursor-width",
            `${targetCircular ? size : targetRect.width + expansion}px`,
          );
          cursor.style.setProperty(
            "--cursor-height",
            `${targetCircular ? size : targetRect.height + expansion}px`,
          );
          cursor.style.setProperty(
            "--cursor-radius",
            targetCircular || targetPill ? "999px" : "5px",
          );
          cursor.style.setProperty("--cursor-hint-x", `${hintX}%`);
          cursor.style.setProperty("--cursor-hint-y", `${hintY}%`);
          return;
        }

        setSnapped(null);
        setMode(targetLargeMode);
        if (targetLargeMode === "frame") {
          const expansion = 8;
          const localX = Math.min(Math.max(pointerX - targetRect.left, 0), targetRect.width);
          const localY = Math.min(Math.max(pointerY - targetRect.top, 0), targetRect.height);
          const hintX = targetRect.width ? (localX / targetRect.width) * 100 : 50;
          const hintY = targetRect.height ? (localY / targetRect.height) * 100 : 50;
          const horizontal = localX < targetRect.width / 2 ? "left" : "right";
          const vertical = localY < targetRect.height / 2 ? "top" : "bottom";

          const centerX = targetRect.left + targetRect.width / 2;
          const centerY = targetRect.top + targetRect.height / 2;

          cursor.dataset.corner = `${vertical}-${horizontal}`;
          if (loading) setLoadingOffset(pointerX - centerX, pointerY - centerY);
          cursor.style.transform = `translate3d(${centerX}px, ${centerY}px, 0)`;
          cursor.style.setProperty("--cursor-width", `${targetRect.width + expansion}px`);
          cursor.style.setProperty("--cursor-height", `${targetRect.height + expansion}px`);
          cursor.style.setProperty("--cursor-radius", "0px");
          cursor.style.setProperty("--cursor-hint-x", `${hintX}%`);
          cursor.style.setProperty("--cursor-hint-y", `${hintY}%`);
          return;
        }

        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      setSnapped(null);
      if (loading) {
        setMode("loading");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      setMode("dot");
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      updateAutoScrollVelocity();
      scheduleDraw();
    };

    const onPointerOver = (event: PointerEvent) => {
      const resolved = resolveCursorTarget(event.target);
      textTargetHovered = resolved.kind === "text";
      rangeTargetHovered = resolved.kind === "range";
      customScrollbarTargetHovered = resolved.kind === "scrollbar";
      if (customScrollbarTargetHovered) {
        const nextScrollbarAxis = resolved.scrollbarAxis ?? "vertical";
        if (scrollbarAxis !== nextScrollbarAxis) {
          scrollbarAxis = nextScrollbarAxis;
          cursor.dataset.scrollbarAxis = scrollbarAxis;
          if (currentMode === "scrollbar") {
            applyCursorGeometry(cursor, "scrollbar", scrollbarAxis);
          }
        }
      }

      if (["scrollbar", "text", "range", "passive"].includes(resolved.kind)) {
        target = null;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        setAccent(resolved.element);
        setVisible(true);
        scheduleDraw();
        return;
      }

      if (resolved.kind === "native") {
        target = null;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        setVisible(false);
        return;
      }

      const nextTarget = resolved.snapTarget;
      const targetChanged = nextTarget !== target;
      if (targetChanged) {
        target = nextTarget;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        targetDirty = Boolean(target);
      }
      setAccent(target ?? resolved.element);
      const becameVisible = !visible;
      setVisible(true);
      if (!targetChanged && !becameVisible) return;
      scheduleDraw();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 1 || autoScrollTarget) return;
      setPressed(true);
    };
    const onPointerUp = () => {
      setPressed(false);
    };
    // 캡처 단계로 듣는다. next/link 는 자기 핸들러에서 기본 동작을 취소하므로, 버블 단계의
    // window 리스너에는 `defaultPrevented` 가 이미 true 로 도착한다.
    const onClick = (event: MouseEvent) => {
      if (suppressNextClick) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      // 해제 신호가 pathname 변화라, 쿼리만 바꾸는 모달 딥링크(?photo=·?work=·?project=)에는
      // 표시를 걸지 않는다. 걸면 해제될 일이 없어 안전 타이머가 만료될 때까지 남는다.
      if (
        nextUrl.origin !== window.location.origin ||
        nextUrl.pathname === window.location.pathname
      ) {
        return;
      }
      setCursorLoading("route", true);
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0 && autoScrollTarget) {
        event.preventDefault();
        suppressNextClick = true;
        stopAutoScroll();
        return;
      }
      if (event.button !== 1) return;

      if (autoScrollTarget) {
        event.preventDefault();
        suppressNextAuxClick = true;
        stopAutoScroll();
        return;
      }

      const element = event.target instanceof Element ? event.target : null;
      if (!media.matches || element?.closest(AUTO_SCROLL_EXCLUDED_SELECTOR)) return;

      const scroller = findVerticalScroller(event.target);
      if (!scroller) return;

      event.preventDefault();
      suppressNextAuxClick = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      autoScrollAnchorY = event.clientY;
      autoScrollTarget = scroller;
      autoScrollVelocityY = 0;
      autoScrollPreviousTime = 0;
      setAccent(element);
      setSnapped(null);
      setVisible(true);
      setPressed(false);
      autoScrollAnchor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      autoScrollAnchor.dataset.visible = "true";
      cursor.dataset.scrollDirection = "idle";
      scheduleDraw();
    };
    const onAuxClick = (event: MouseEvent) => {
      if (event.button !== 1 || !suppressNextAuxClick) return;
      suppressNextAuxClick = false;
      event.preventDefault();
    };
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") stopAutoScroll();
    };
    const onLoadingChange = (event: Event) => {
      const { id, active } = (event as CustomEvent<CursorLoadingDetail>).detail;
      if (active) loadingIds.add(id);
      else loadingIds.delete(id);

      window.clearTimeout(loadingDelayTimer);
      window.clearTimeout(loadingSafetyTimer);

      if (loadingIds.size === 0) {
        setLoading(false);
        return;
      }

      loadingSafetyTimer = window.setTimeout(() => {
        loadingIds.clear();
        setLoading(false);
      }, 10_000);
      if (loading) return;

      loadingDelayTimer = window.setTimeout(() => {
        if (loadingIds.size === 0) return;
        setLoading(true);
      }, 150);
    };
    const onWheel = (event: WheelEvent) => {
      if (autoScrollTarget) stopAutoScroll();
      if (event.deltaY === 0 || !findVerticalScroller(event.target)) {
        window.clearTimeout(scrollEndTimer);
        if (scrolling) {
          scrolling = false;
          if (target) targetDirty = true;
          scheduleDraw();
        }
        return;
      }

      scrolling = true;
      window.clearTimeout(scrollEndTimer);
      scheduleDraw();
      scrollEndTimer = window.setTimeout(() => {
        scrolling = false;
        if (target) targetDirty = true;
        scheduleDraw();
      }, 180);
    };
    const onPointerLeave = () => {
      setVisible(false);
    };
    const onWindowBlur = () => {
      stopAutoScroll();
      onPointerLeave();
    };
    const onMapTargetHover = (event: Event) => {
      mapTargetHovered = (event as CustomEvent<boolean>).detail;
      scheduleDraw();
    };
    const onMediaChange = () => {
      if (media.matches) {
        root.setAttribute("data-custom-cursor", "");
      } else {
        stopAutoScroll();
        root.removeAttribute("data-custom-cursor");
        setSnapped(null);
        setVisible(false);
      }
    };

    onMediaChange();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerover", onPointerOver, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("auxclick", onAuxClick);
    // onClick 을 먼저 등록해 `suppressNextClick` 을 onClickCapture 가 소비하기 전에 읽는다.
    window.addEventListener("click", onClick, true);
    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener(CUSTOM_CURSOR_LOADING_EVENT, onLoadingChange);
    window.addEventListener(CUSTOM_CURSOR_MAP_HOVER_EVENT, onMapTargetHover);
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    const onViewportChange = () => {
      if (target) targetDirty = true;
      scheduleDraw();
    };

    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    media.addEventListener("change", onMediaChange);

    return () => {
      root.removeAttribute("data-custom-cursor");
      setSnapped(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("auxclick", onAuxClick);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener(CUSTOM_CURSOR_LOADING_EVENT, onLoadingChange);
      window.removeEventListener(CUSTOM_CURSOR_MAP_HOVER_EVENT, onMapTargetHover);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      media.removeEventListener("change", onMediaChange);
      window.clearTimeout(loadingDelayTimer);
      window.clearTimeout(loadingSafetyTimer);
      window.clearTimeout(scrollEndTimer);
      window.clearTimeout(frameExitTimer);
      if (frame) window.cancelAnimationFrame(frame);
      if (autoScrollFrame) window.cancelAnimationFrame(autoScrollFrame);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        className={styles.cursor}
        data-custom-cursor-ui
        data-visible="false"
        aria-hidden="true"
      >
        <span className={styles.shape} />
        <span className={styles.markerDot} />
        <span className={styles.markerArrow}>
          <svg viewBox="0 0 14 14">
            <path d="M2 2h8v8" />
          </svg>
        </span>
        <span className={styles.rangeIndicator}>
          <svg viewBox="0 0 34 18">
            <path d="M7 5 3 9l4 4M27 5l4 4-4 4" />
            <circle cx="17" cy="9" r="2.25" />
          </svg>
        </span>
        <span className={styles.scrollbarIndicator}>
          <svg viewBox="0 0 20 28">
            <path d="m6.5 9 3.5-3.5L13.5 9M6.5 19l3.5 3.5 3.5-3.5" />
          </svg>
        </span>
        <span className={styles.autoScrollDirection}>
          <svg viewBox="0 0 16 16">
            <path d="m4 10 4-4 4 4" />
          </svg>
        </span>
        <span className={styles.loadingOrbit}>
          <svg viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="10.5" />
          </svg>
        </span>
        <span className={`${styles.corner} ${styles.cornerTopLeft}`} />
        <span className={`${styles.corner} ${styles.cornerTopRight}`} />
        <span className={`${styles.corner} ${styles.cornerBottomLeft}`} />
        <span className={`${styles.corner} ${styles.cornerBottomRight}`} />
      </div>
      <div
        ref={autoScrollAnchorRef}
        className={styles.autoScrollAnchor}
        data-autoscroll-anchor
        data-visible="false"
        aria-hidden="true"
      />
    </>
  );
};

export { CustomCursor };
