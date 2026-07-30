"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  CUSTOM_CURSOR_LOADING_EVENT,
  CUSTOM_CURSOR_MAP_HOVER_EVENT,
  setCursorLoading,
  type CursorLoadingDetail,
} from "@/utils/custom-cursor-events";

import styles from "./CustomCursor.module.css";

const ENABLE_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, [data-cursor-target]';
const TEXT_SELECTOR = [
  "input:not([type])",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="url"]',
  'input[type="tel"]',
  'input[type="password"]',
  "textarea",
  '[contenteditable="true"]',
].join(", ");
const RANGE_CONTROL_SELECTOR = 'input[type="range"]';
const NATIVE_CONTROL_SELECTOR = 'input[type="checkbox"], input[type="radio"], select';
const SECTION_ACCENTS: Record<string, string> = {
  photo: "var(--accent-photo)",
  music: "var(--accent-music)",
  dev: "var(--accent-dev)",
  contact: "var(--accent-contact)",
};
const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

const canScrollVertically = (eventTarget: EventTarget | null) => {
  let element = eventTarget instanceof HTMLElement ? eventTarget : null;

  while (element && element !== document.body && element !== document.documentElement) {
    const overflowY = getComputedStyle(element).overflowY;
    if (SCROLLABLE_OVERFLOW.has(overflowY) && element.scrollHeight > element.clientHeight + 1) {
      return true;
    }
    element = element.parentElement;
  }

  const scroller = document.scrollingElement ?? document.documentElement;
  const rootOverflowY = getComputedStyle(document.documentElement).overflowY;
  const bodyOverflowY = getComputedStyle(document.body).overflowY;
  return (
    rootOverflowY !== "hidden" &&
    rootOverflowY !== "clip" &&
    bodyOverflowY !== "hidden" &&
    bodyOverflowY !== "clip" &&
    scroller.scrollHeight > scroller.clientHeight + 1
  );
};

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setCursorLoading("route", false);
  }, [pathname]);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

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
    let scrolling = false;
    let loading = false;
    const loadingIds = new Set<string>();
    let loadingDelayTimer = 0;
    let loadingSafetyTimer = 0;
    let scrollEndTimer = 0;
    let frameExitTimer = 0;
    let frame = 0;

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

    // 스냅된 요소에만 마킹 — 각 컴포넌트의 배경형 :hover가 :not([data-cursor-snapped])로
    // 자신을 끄게 해서 커서 면칠과 기초 호버 배경이 겹치지 않게 한다.
    const setSnapped = (next: HTMLElement | null) => {
      if (next === snapped) return;
      if (snapped) delete snapped.dataset.cursorSnapped;
      snapped = next;
      if (snapped) snapped.dataset.cursorSnapped = "true";
    };

    const setMode = (
      next: "dot" | "ring" | "scroll" | "snap" | "text" | "range" | "frame" | "link" | "loading",
    ) => {
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

      if (next === "dot") {
        cursor.style.setProperty("--cursor-width", "12px");
        cursor.style.setProperty("--cursor-height", "12px");
        cursor.style.setProperty("--cursor-radius", "999px");
      } else if (next === "ring") {
        cursor.style.setProperty("--cursor-width", "34px");
        cursor.style.setProperty("--cursor-height", "34px");
        cursor.style.setProperty("--cursor-radius", "999px");
      } else if (next === "scroll") {
        cursor.style.setProperty("--cursor-width", "18px");
        cursor.style.setProperty("--cursor-height", "28px");
        cursor.style.setProperty("--cursor-radius", "9px");
      } else if (next === "text") {
        cursor.style.setProperty("--cursor-width", "4px");
        cursor.style.setProperty("--cursor-height", "24px");
        cursor.style.setProperty("--cursor-radius", "999px");
      } else if (next === "range") {
        cursor.style.setProperty("--cursor-width", "34px");
        cursor.style.setProperty("--cursor-height", "18px");
        cursor.style.setProperty("--cursor-radius", "999px");
      } else if (next === "link") {
        cursor.style.setProperty("--cursor-width", "30px");
        cursor.style.setProperty("--cursor-height", "30px");
        cursor.style.setProperty("--cursor-radius", "999px");
      } else if (next === "loading") {
        cursor.style.setProperty("--cursor-width", "22px");
        cursor.style.setProperty("--cursor-height", "22px");
        cursor.style.setProperty("--cursor-radius", "999px");
      }
    };

    const setAccent = (element: Element | null) => {
      const section = element?.closest<HTMLElement>("[data-section]")?.dataset.section;
      const accent = SECTION_ACCENTS[section ?? ""] ?? "var(--accent)";
      if (accent === currentAccent) return;
      currentAccent = accent;
      cursor.style.setProperty("--cursor-accent", accent);
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
      targetCompact = targetRect.width <= 320 && targetRect.height <= 72;
      targetLargeMode = target.dataset.cursorLarge === "frame" ? "frame" : "link";
      if (!targetCompact) return;

      targetPill = target.dataset.cursorShape === "pill";
      const targetRadius = Number.parseFloat(getComputedStyle(target).borderRadius) || 0;
      targetCircular =
        Math.abs(targetRect.width - targetRect.height) <= 4 &&
        targetRadius >= Math.min(targetRect.width, targetRect.height) / 2 - 2;
    };

    const draw = () => {
      frame = 0;
      if (!media.matches) return;

      if (targetDirty) measureTarget();

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

      if (target && targetRect) {
        if (targetCompact) {
          const expansion = 5.5;
          const size = Math.max(targetRect.width, targetRect.height) + expansion;
          const localX = Math.min(Math.max(pointerX - targetRect.left, 0), targetRect.width);
          const localY = Math.min(Math.max(pointerY - targetRect.top, 0), targetRect.height);
          const hintX = targetRect.width ? (localX / targetRect.width) * 100 : 50;
          const hintY = targetRect.height ? (localY / targetRect.height) * 100 : 50;

          setSnapped(target);
          setMode("snap");
          cursor.style.transform = `translate3d(${
            targetRect.left + targetRect.width / 2
          }px, ${targetRect.top + targetRect.height / 2}px, 0)`;
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

          cursor.dataset.corner = `${vertical}-${horizontal}`;
          cursor.style.transform = `translate3d(${
            targetRect.left + targetRect.width / 2
          }px, ${targetRect.top + targetRect.height / 2}px, 0)`;
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
      scheduleDraw();
    };

    const onPointerOver = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const textElement = element?.closest(TEXT_SELECTOR) ?? null;
      const rangeElement = element?.closest(RANGE_CONTROL_SELECTOR) ?? null;
      textTargetHovered = Boolean(textElement);
      rangeTargetHovered = Boolean(rangeElement);

      if (textElement) {
        target = null;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        setAccent(textElement);
        setVisible(true);
        scheduleDraw();
        return;
      }

      if (rangeElement) {
        target = null;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        setAccent(rangeElement);
        setVisible(true);
        scheduleDraw();
        return;
      }

      if (element?.closest(NATIVE_CONTROL_SELECTOR)) {
        target = null;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        setVisible(false);
        return;
      }

      const nextTarget = element?.closest<HTMLElement>(INTERACTIVE_SELECTOR) ?? null;
      const targetChanged = nextTarget !== target;
      if (targetChanged) {
        target = nextTarget;
        targetRect = null;
        targetCompact = false;
        targetCircular = false;
        targetPill = false;
        targetDirty = Boolean(target);
      }
      setAccent(target ?? element);
      const becameVisible = !visible;
      setVisible(true);
      if (!targetChanged && !becameVisible) return;
      scheduleDraw();
    };

    const onPointerDown = () => {
      setPressed(true);
    };
    const onPointerUp = () => {
      setPressed(false);
    };
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (
        nextUrl.origin !== window.location.origin ||
        `${nextUrl.pathname}${nextUrl.search}` ===
          `${window.location.pathname}${window.location.search}`
      ) {
        return;
      }
      setCursorLoading("route", true);
    };
    const onLoadingChange = (event: Event) => {
      const { id, active } = (event as CustomEvent<CursorLoadingDetail>).detail;
      if (active) loadingIds.add(id);
      else loadingIds.delete(id);

      window.clearTimeout(loadingDelayTimer);
      window.clearTimeout(loadingSafetyTimer);

      if (loadingIds.size === 0) {
        if (loading) {
          loading = false;
          scheduleDraw();
        }
        return;
      }

      loadingSafetyTimer = window.setTimeout(() => {
        loadingIds.clear();
        loading = false;
        scheduleDraw();
      }, 10_000);
      if (loading) return;

      loadingDelayTimer = window.setTimeout(() => {
        if (loadingIds.size === 0) return;
        loading = true;
        scheduleDraw();
      }, 150);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0 || !canScrollVertically(event.target)) {
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
    const onMapTargetHover = (event: Event) => {
      mapTargetHovered = (event as CustomEvent<boolean>).detail;
      scheduleDraw();
    };
    const onMediaChange = () => {
      if (media.matches) {
        root.setAttribute("data-custom-cursor", "");
      } else {
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
    window.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("blur", onPointerLeave);
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
      window.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", onPointerLeave);
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
    };
  }, []);

  return (
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
  );
};

export { CustomCursor };
