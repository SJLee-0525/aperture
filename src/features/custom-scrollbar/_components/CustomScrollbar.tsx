"use client";

import { useEffect, useRef } from "react";

import styles from "./CustomScrollbar.module.css";

/* 막대가 그려지는 조건. globals.css 의 네이티브 스크롤바 제거 규칙,
   CustomScrollbar.module.css 의 .track 미디어 쿼리와 같은 조건이어야 한다.
   하나만 좁으면 그 구간에서 스크롤 위치를 알려 주는 단서가 하나도 남지 않는다. */
const ENABLE_QUERY =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (min-width: 901px)";
const MIN_THUMB_HEIGHT = 44;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const CustomScrollbar = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const root = document.documentElement;
    const media = window.matchMedia(ENABLE_QUERY);
    let frame = 0;
    let maxScroll = 0;
    let thumbHeight = 0;
    let thumbTop = 0;
    let travel = 0;
    let dragging = false;
    let dragOffset = 0;
    let activePointerId = -1;
    let previousScrollTop = 0;
    let previousUpdateTime = 0;
    let settleTimer = 0;
    let activeScroller = (document.scrollingElement ?? root) as HTMLElement;
    let scrollScope: "page" | "modal" | "local" = "page";

    const resolveScroller = () => {
      const modalScrollers = document.querySelectorAll<HTMLElement>(
        '[data-custom-scroll-container]:not([data-custom-scroll-scope="local"])',
      );
      const modalScroller = modalScrollers.item(modalScrollers.length - 1);
      const localScrollers = document.querySelectorAll<HTMLElement>(
        '[data-custom-scroll-container][data-custom-scroll-scope="local"]',
      );
      let localScroller: HTMLElement | null = null;
      for (let index = localScrollers.length - 1; index >= 0; index -= 1) {
        const candidate = localScrollers.item(index);
        if (
          candidate &&
          candidate.getClientRects().length > 0 &&
          (candidate.hasAttribute("data-custom-scroll-priority") ||
            candidate.scrollHeight > candidate.clientHeight + 1)
        ) {
          localScroller = candidate;
          break;
        }
      }
      const nextScroller =
        modalScroller ?? localScroller ?? ((document.scrollingElement ?? root) as HTMLElement);
      const nextScope = modalScroller ? "modal" : localScroller ? "local" : "page";

      if (nextScroller !== activeScroller) {
        activeScroller = nextScroller;
        previousScrollTop = activeScroller.scrollTop;
        previousUpdateTime = 0;
        settleThumb();
        stopDragging();
      }
      scrollScope = nextScope;
    };

    const settleThumb = () => {
      thumb.style.setProperty("--scroll-stretch", "1");
      thumb.style.setProperty("--scroll-squash", "1");
    };

    const animateThumb = (scrollTop: number, timestamp: number) => {
      if (!previousUpdateTime) {
        previousScrollTop = scrollTop;
        previousUpdateTime = timestamp;
        return;
      }

      const elapsed = Math.max(timestamp - previousUpdateTime, 1);
      const delta = scrollTop - previousScrollTop;
      const speed = Math.abs(delta) / elapsed;
      previousScrollTop = scrollTop;
      previousUpdateTime = timestamp;

      if (Math.abs(delta) < 0.5) return;
      const force = Math.min(speed / 0.5, 1);
      thumb.style.setProperty("--scroll-stretch", String(1 - force * 0.2));
      thumb.style.setProperty("--scroll-squash", String(1 - force * 0.02));
      thumb.style.setProperty("--scroll-origin", delta > 0 ? "bottom center" : "top center");

      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleThumb, dragging ? 70 : 105);
    };

    const update = (timestamp: number) => {
      frame = 0;
      if (!media.matches) {
        track.dataset.visible = "false";
        track.tabIndex = -1;
        track.setAttribute("aria-hidden", "true");
        root.removeAttribute("data-custom-scrollbar");
        return;
      }

      resolveScroller();
      const scroller = activeScroller;
      let trackTop = scrollScope === "modal" ? 12 : 88.8;
      let trackRight = 6;
      let trackBottom = 12;
      if (scrollScope === "local") {
        const rect = scroller.getBoundingClientRect();
        trackTop = rect.top + 10;
        trackRight = window.innerWidth - rect.right + 4;
        trackBottom = window.innerHeight - rect.bottom + 10;
      }
      const viewportHeight = scroller.clientHeight;
      const scrollHeight = scroller.scrollHeight;
      const scrollTop = scroller.scrollTop;
      const trackHeight = Math.max(window.innerHeight - trackTop - trackBottom, 0);
      maxScroll = Math.max(scrollHeight - viewportHeight, 0);
      thumbHeight =
        maxScroll > 0
          ? clamp((viewportHeight / scrollHeight) * trackHeight, MIN_THUMB_HEIGHT, trackHeight)
          : trackHeight;
      travel = Math.max(trackHeight - thumbHeight, 0);
      thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * travel : 0;
      const visible = maxScroll > 1 && trackHeight >= MIN_THUMB_HEIGHT;
      animateThumb(scrollTop, timestamp);

      root.setAttribute("data-custom-scrollbar", "");
      track.style.setProperty("--track-top", `${trackTop}px`);
      track.style.setProperty("--track-right", `${trackRight}px`);
      track.style.setProperty("--track-bottom", `${trackBottom}px`);
      track.dataset.scrollScope = scrollScope;
      // 어느 컨테이너를 몰고 있는지와 그 위치. 장식이라 ARIA 로 내보내지 않지만 스크롤러
      // 해석 결과가 화면 밖에서 관측 가능해야 회귀를 잡을 수 있다.
      track.dataset.scrollTarget = scrollScope === "page" ? "page-content" : scroller.id;
      track.dataset.scrollTop = String(Math.round(scrollTop));
      track.dataset.visible = String(visible);
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const scrollFromPointer = (clientY: number) => {
      if (travel <= 0 || maxScroll <= 0) return;
      const trackTop = track.getBoundingClientRect().top;
      const nextTop = clamp(clientY - trackTop - dragOffset, 0, travel);
      activeScroller.scrollTop = (nextTop / travel) * maxScroll;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || maxScroll <= 0) return;
      event.preventDefault();
      activePointerId = event.pointerId;
      dragging = true;
      track.dataset.dragging = "true";
      track.setPointerCapture(event.pointerId);

      const trackTop = track.getBoundingClientRect().top;
      const hitThumb = event.target instanceof Node && thumb.contains(event.target);
      dragOffset = hitThumb ? event.clientY - trackTop - thumbTop : thumbHeight / 2;
      scrollFromPointer(event.clientY);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== activePointerId) return;
      scrollFromPointer(event.clientY);
    };

    const stopDragging = (event?: PointerEvent) => {
      if (!dragging || (event && event.pointerId !== activePointerId)) return;
      dragging = false;
      track.dataset.dragging = "false";
      if (activePointerId >= 0 && track.hasPointerCapture(activePointerId)) {
        track.releasePointerCapture(activePointerId);
      }
      activePointerId = -1;
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const mutationObserver = new MutationObserver(scheduleUpdate);
    resizeObserver.observe(root);
    resizeObserver.observe(document.body);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", stopDragging);
    track.addEventListener("pointercancel", stopDragging);
    document.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    media.addEventListener("change", scheduleUpdate);
    scheduleUpdate();

    return () => {
      root.removeAttribute("data-custom-scrollbar");
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", stopDragging);
      track.removeEventListener("pointercancel", stopDragging);
      document.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      media.removeEventListener("change", scheduleUpdate);
      window.clearTimeout(settleTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className={styles.track}
      data-custom-scrollbar-ui
      data-visible="false"
      data-dragging="false"
      aria-hidden="true"
    >
      <div ref={thumbRef} className={styles.thumb} data-custom-scrollbar-thumb>
        <span className={styles.thumbShape} />
      </div>
    </div>
  );
};

export { CustomScrollbar };
