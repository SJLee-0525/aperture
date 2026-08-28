import {
  applyCursorGeometry,
  type CursorMode,
  type ScrollbarAxis,
} from "@/features/pointer-chrome/_lib/cursor-mode";
import {
  CURSOR_ACCENT_VAR,
  DATA_CURSOR_SNAPPED,
} from "@/features/pointer-chrome/_lib/pointer-chrome-contract";

import { stripLangPrefix } from "@/lib/i18n/locale-path";

const SECTION_ACCENTS: Record<string, string> = {
  photo: "var(--accent-photo)",
  music: "var(--accent-music)",
  dev: "var(--accent-dev)",
  contact: "var(--accent-contact)",
  legal: "var(--accent-photo)",
};
const LANDING_CURSOR_ACCENT = "var(--cursor-landing-accent)";
/** 프레임 모드에서 빠져나올 때 모서리 표식이 사라지는 시간. */
const FRAME_EXIT_MS = 32;

/** 포인터가 얹힌 대상의 종류. 대상마다 커서 모양이 다르다. */
type CursorHover = "none" | "text" | "range" | "scrollbar";

type CursorStateOptions = {
  cursor: HTMLElement;
  autoScrollAnchor: HTMLElement;
  /** 커스텀 커서를 그릴 수 있는 입력 환경인지. 매 프레임 확인한다. */
  isEnabled: () => boolean;
  /** accent 를 고를 때 쓰는 현재 경로. 랜딩만 중립색이다. */
  getPathname: () => string;
};

/**
 * 커서 요소의 표시 상태와 그리기.
 *
 * 좌표·대상·모드는 전부 여기 안에 있고 밖에서는 setter 로만 바꾼다. 그리기는 한 프레임에
 * 한 번으로 모으므로, 어느 setter 를 몇 번 부르든 DOM 쓰기는 다음 프레임에 한 번이다.
 */
const createCursorState = ({
  cursor,
  autoScrollAnchor,
  isEnabled,
  getPathname,
}: CursorStateOptions) => {
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
  let mapHovered = false;
  let hover: CursorHover = "none";
  let scrollbarAxis: ScrollbarAxis = "vertical";
  let scrolling = false;
  let loading = false;
  let autoScrolling = false;
  let frame = 0;
  let frameExitTimer = 0;

  const scheduleDraw = () => {
    if (!frame) frame = window.requestAnimationFrame(draw);
  };

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

  // 대기 표시는 모드와 따로 둔다. draw 는 스냅된 대상이 있으면 먼저 반환하는데, 링크를
  // 클릭한 직후가 바로 그 상태라 모드에만 기대면 이동 중 표시가 나오지 않는다.
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
    if (snapped) snapped.removeAttribute(DATA_CURSOR_SNAPPED);
    snapped = next;
    if (snapped) snapped.setAttribute(DATA_CURSOR_SNAPPED, "true");
  };

  const setMode = (next: CursorMode) => {
    if (next === currentMode) return;

    window.clearTimeout(frameExitTimer);
    if (currentMode === "frame" && next !== "frame") {
      cursor.dataset.frameExit = "true";
      frameExitTimer = window.setTimeout(() => {
        delete cursor.dataset.frameExit;
      }, FRAME_EXIT_MS);
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
      (stripLangPrefix(getPathname()) === "/" ? LANDING_CURSOR_ACCENT : "var(--accent)");
    if (accent === currentAccent) return;
    currentAccent = accent;
    cursor.style.setProperty(CURSOR_ACCENT_VAR, accent);
    autoScrollAnchor.style.setProperty(CURSOR_ACCENT_VAR, accent);
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

  /** 포인터 자리에 그리고 스냅을 푸는 모드들의 공통 처리. */
  const drawAtPointer = (mode: CursorMode) => {
    setSnapped(null);
    setMode(mode);
    cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
  };

  function draw() {
    frame = 0;
    if (!isEnabled()) return;

    if (targetDirty) measureTarget();
    // 그 밖의 모드는 요소가 포인터 위에 있어 보정이 필요 없다.
    if (loading) setLoadingOffset(0, 0);

    if (autoScrolling) {
      drawAtPointer("autoscroll");
      return;
    }
    if (scrolling) {
      drawAtPointer("scroll");
      return;
    }
    if (mapHovered) {
      drawAtPointer("ring");
      return;
    }
    if (hover !== "none") {
      drawAtPointer(hover);
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
        cursor.style.setProperty("--cursor-radius", targetCircular || targetPill ? "999px" : "5px");
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

    drawAtPointer(loading ? "loading" : "dot");
  }

  const clearTarget = () => {
    target = null;
    targetRect = null;
    targetCompact = false;
    targetCircular = false;
    targetPill = false;
  };

  return {
    isVisible: () => visible,
    setPointer(x: number, y: number) {
      pointerX = x;
      pointerY = y;
    },
    setVisible,
    setPressed,
    setLoading,
    setAccent,
    setSnapped,
    scheduleDraw,
    clearTarget,
    /** 대상이 실제로 바뀌었는지 돌려준다. 바뀌지 않았으면 다시 그릴 필요가 없다. */
    setTarget(next: HTMLElement | null): boolean {
      if (next === target) return false;
      clearTarget();
      target = next;
      targetDirty = Boolean(target);
      return true;
    },
    setMapHovered(next: boolean) {
      mapHovered = next;
    },
    setHover(next: CursorHover) {
      hover = next;
    },
    setScrollbarAxis(axis: ScrollbarAxis) {
      if (scrollbarAxis === axis) return;
      scrollbarAxis = axis;
      cursor.dataset.scrollbarAxis = axis;
      if (currentMode === "scrollbar") applyCursorGeometry(cursor, "scrollbar", axis);
    },
    setScrolling(next: boolean) {
      scrolling = next;
    },
    setAutoScrolling(next: boolean) {
      autoScrolling = next;
    },
    /** 다음 그리기에서 대상의 크기를 다시 잰다. 스크롤·리사이즈 뒤에 필요하다. */
    markTargetDirty() {
      if (target) targetDirty = true;
    },
    dispose() {
      setSnapped(null);
      window.clearTimeout(frameExitTimer);
      if (frame) window.cancelAnimationFrame(frame);
    },
  };
};

type CursorState = ReturnType<typeof createCursorState>;

export { createCursorState };
export type { CursorState };
