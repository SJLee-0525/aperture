"use client";

import { useEffect, type RefObject } from "react";

import { createAutoScrollController } from "@/features/custom-cursor/_lib/auto-scroll-controller";
import { createCursorLoadingRegistry } from "@/features/custom-cursor/_lib/cursor-loading-registry";
import { createCursorState } from "@/features/custom-cursor/_lib/cursor-state";
import { resolveCursorTarget } from "@/features/custom-cursor/_lib/cursor-target";
import { findVerticalScroller } from "@/features/custom-cursor/_lib/vertical-scroller";

import {
  CUSTOM_CURSOR_LOADING_EVENT,
  CUSTOM_CURSOR_MAP_HOVER_EVENT,
  setCursorLoading,
  type CursorLoadingDetail,
} from "@/utils/custom-cursor-events";

/** 커스텀 커서를 그릴 입력 환경. 손가락 입력과 모션 축소 설정에서는 기본 커서를 쓴다. */
const ENABLE_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
/** 자동 스크롤을 걸지 않는 대상. 가운데 클릭이 이미 다른 뜻을 갖는 곳들이다. */
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
/** 휠이 멈춘 것으로 보는 시간. */
const SCROLL_END_MS = 180;

type Options = {
  cursorRef: RefObject<HTMLDivElement | null>;
  autoScrollAnchorRef: RefObject<HTMLDivElement | null>;
  /** accent 판정에 쓰는 현재 경로. 효과를 다시 실행하지 않으려고 ref 로 읽는다. */
  getPathname: () => string;
};

/**
 * 포인터·휠·키보드 입력을 커서 상태와 자동 스크롤에 연결한다.
 *
 * 효과는 한 번만 실행한다. 포인터 좌표가 이 안의 상태에 있어 다시 실행하면 좌상단으로
 * 초기화되고, 직후의 스크롤 이벤트가 커서를 그 자리에 그린다.
 */
const useCursorPointerEvents = ({ cursorRef, autoScrollAnchorRef, getPathname }: Options) => {
  useEffect(() => {
    const cursor = cursorRef.current;
    const autoScrollAnchor = autoScrollAnchorRef.current;
    if (!cursor || !autoScrollAnchor) return;

    const root = document.documentElement;
    const media = window.matchMedia(ENABLE_QUERY);
    const state = createCursorState({
      cursor,
      autoScrollAnchor,
      isEnabled: () => media.matches,
      getPathname,
    });
    const autoScroll = createAutoScrollController({ cursor, anchor: autoScrollAnchor, state });
    const loadingRegistry = createCursorLoadingRegistry(state.setLoading);

    let scrolling = false;
    let scrollEndTimer = 0;
    let suppressNextClick = false;
    let suppressNextAuxClick = false;

    const onPointerMove = (event: PointerEvent) => {
      state.setPointer(event.clientX, event.clientY);
      autoScroll.updateVelocity(event.clientY);
      state.scheduleDraw();
    };

    const onPointerOver = (event: PointerEvent) => {
      const resolved = resolveCursorTarget(event.target);
      state.setHover(
        resolved.kind === "text" || resolved.kind === "range" || resolved.kind === "scrollbar"
          ? resolved.kind
          : "none",
      );
      if (resolved.kind === "scrollbar") {
        state.setScrollbarAxis(resolved.scrollbarAxis ?? "vertical");
      }

      if (["scrollbar", "text", "range", "passive"].includes(resolved.kind)) {
        state.setTarget(null);
        state.setAccent(resolved.element);
        state.setVisible(true);
        state.scheduleDraw();
        return;
      }

      if (resolved.kind === "native") {
        state.setTarget(null);
        state.setVisible(false);
        return;
      }

      const targetChanged = state.setTarget(resolved.snapTarget);
      state.setAccent(resolved.snapTarget ?? resolved.element);
      const becameVisible = !state.isVisible();
      state.setVisible(true);
      if (!targetChanged && !becameVisible) return;
      state.scheduleDraw();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 1 || autoScroll.isActive()) return;
      state.setPressed(true);
    };
    const onPointerUp = () => {
      state.setPressed(false);
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
      if (event.button === 0 && autoScroll.isActive()) {
        event.preventDefault();
        suppressNextClick = true;
        autoScroll.stop();
        return;
      }
      if (event.button !== 1) return;

      if (autoScroll.isActive()) {
        event.preventDefault();
        suppressNextAuxClick = true;
        autoScroll.stop();
        return;
      }

      const element = event.target instanceof Element ? event.target : null;
      if (!media.matches || element?.closest(AUTO_SCROLL_EXCLUDED_SELECTOR)) return;

      const scroller = findVerticalScroller(event.target);
      if (!scroller) return;

      event.preventDefault();
      suppressNextAuxClick = true;
      autoScroll.start(scroller, event.clientX, event.clientY, element);
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
    // 자동 스크롤은 오버레이가 아니라 커서 상태다. `useEscapeKey` 로 옮기면 전역 stack 에
    // 등록되어 열려 있는 모달의 Escape 를 가로챈다.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") autoScroll.stop();
    };
    const onLoadingChange = (event: Event) => {
      const { id, active } = (event as CustomEvent<CursorLoadingDetail>).detail;
      loadingRegistry.update(id, active);
    };

    const setScrolling = (next: boolean) => {
      if (scrolling === next) return;
      scrolling = next;
      state.setScrolling(next);
      if (!next) state.markTargetDirty();
      state.scheduleDraw();
    };

    const onWheel = (event: WheelEvent) => {
      if (autoScroll.isActive()) autoScroll.stop();
      window.clearTimeout(scrollEndTimer);
      if (event.deltaY === 0 || !findVerticalScroller(event.target)) {
        setScrolling(false);
        return;
      }

      setScrolling(true);
      state.scheduleDraw();
      scrollEndTimer = window.setTimeout(() => setScrolling(false), SCROLL_END_MS);
    };

    const onPointerLeave = () => {
      state.setVisible(false);
    };
    const onWindowBlur = () => {
      autoScroll.stop();
      onPointerLeave();
    };
    const onMapTargetHover = (event: Event) => {
      state.setMapHovered((event as CustomEvent<boolean>).detail);
      state.scheduleDraw();
    };
    const onViewportChange = () => {
      state.markTargetDirty();
      state.scheduleDraw();
    };
    const onMediaChange = () => {
      if (media.matches) {
        root.setAttribute("data-custom-cursor", "");
        return;
      }
      autoScroll.stop();
      root.removeAttribute("data-custom-cursor");
      state.setSnapped(null);
      state.setVisible(false);
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
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    media.addEventListener("change", onMediaChange);

    return () => {
      root.removeAttribute("data-custom-cursor");
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
      window.clearTimeout(scrollEndTimer);
      loadingRegistry.dispose();
      autoScroll.dispose();
      state.dispose();
    };
  }, [cursorRef, autoScrollAnchorRef, getPathname]);
};

export { useCursorPointerEvents };
