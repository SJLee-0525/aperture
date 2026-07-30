"use client";

import { useEffect, useRef } from "react";

import { CUSTOM_CURSOR_MAP_HOVER_EVENT } from "@/utils/custom-cursor-events";

import styles from "./CustomCursor.module.css";

const ENABLE_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, [data-cursor-target]';
const TEXT_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const SECTION_ACCENTS: Record<string, string> = {
  photo: "var(--accent-photo)",
  music: "var(--accent-music)",
  dev: "var(--accent-dev)",
  contact: "var(--accent-contact)",
};

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

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
    let targetDirty = false;
    let currentAccent = "";
    let currentMode = "";
    let visible = false;
    let pressed = false;
    let mapTargetHovered = false;
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

    const setMode = (next: "dot" | "ring" | "snap") => {
      if (next === currentMode) return;
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
      targetCompact = targetRect.width <= 220 && targetRect.height <= 72;
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

      if (mapTargetHovered) {
        setMode("ring");
        cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
        return;
      }

      if (target && targetRect) {
        if (targetCompact) {
          const size = Math.max(targetRect.width, targetRect.height) + 7;
          setMode("snap");
          cursor.style.transform = `translate3d(${
            targetRect.left + targetRect.width / 2
          }px, ${targetRect.top + targetRect.height / 2}px, 0)`;
          cursor.style.setProperty(
            "--cursor-width",
            `${targetCircular ? size : targetRect.width + 7}px`,
          );
          cursor.style.setProperty(
            "--cursor-height",
            `${targetCircular ? size : targetRect.height + 7}px`,
          );
          cursor.style.setProperty(
            "--cursor-radius",
            targetCircular || targetPill ? "999px" : "0px",
          );
          return;
        }

        setMode("ring");
      } else {
        setMode("dot");
      }

      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    };

    const scheduleDraw = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!targetCompact) scheduleDraw();
    };

    const onPointerOver = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest(TEXT_SELECTOR)) {
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
        setVisible(false);
      }
    };

    onMediaChange();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerover", onPointerOver, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("blur", onPointerLeave);
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
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener(CUSTOM_CURSOR_MAP_HOVER_EVENT, onMapTargetHover);
      document.documentElement.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      media.removeEventListener("change", onMediaChange);
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
    </div>
  );
};

export { CustomCursor };
