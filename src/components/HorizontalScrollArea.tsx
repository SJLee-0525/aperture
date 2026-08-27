"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./HorizontalScrollArea.module.css";

type Props = {
  children: ReactNode;
  as?: "div" | "pre";
  label?: string;
  className?: string;
  viewportClassName?: string;
  dataLanguage?: string;
  codeBlock?: boolean;
};

const HorizontalScrollArea = ({
  children,
  as = "div",
  label,
  className,
  viewportClassName,
  dataLanguage,
  codeBlock,
}: Props) => {
  const viewportRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const metrics = useRef({ max: 0, travel: 0, width: 0, left: 0 });
  const drag = useRef({ id: -1, offset: 0 });

  useEffect(() => {
    const viewport = viewportRef.current,
      track = trackRef.current,
      thumb = thumbRef.current;
    if (!viewport || !track || !thumb) return;
    const update = () => {
      const max = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
      const width = max
        ? Math.max((viewport.clientWidth / viewport.scrollWidth) * track.clientWidth, 44)
        : track.clientWidth;
      const travel = Math.max(track.clientWidth - width, 0);
      const left = max ? (viewport.scrollLeft / max) * travel : 0;
      metrics.current = { max, travel, width, left };
      track.dataset.visible = String(max > 1);
      thumb.style.width = `${width}px`;
      thumb.style.transform = `translate3d(${left}px,0,0)`;
    };
    update();
    viewport.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(viewport);
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild);
    return () => {
      viewport.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, []);

  const move = (clientX: number) => {
    const viewport = viewportRef.current,
      track = trackRef.current;
    if (!viewport || !track) return;
    const left = Math.min(
      Math.max(clientX - track.getBoundingClientRect().left - drag.current.offset, 0),
      metrics.current.travel,
    );
    viewport.scrollLeft = metrics.current.travel
      ? (left / metrics.current.travel) * metrics.current.max
      : 0;
  };

  const stopDragging = (track: HTMLDivElement, pointerId: number) => {
    if (drag.current.id !== pointerId) return;
    drag.current.id = -1;
    track.dataset.dragging = "false";
    if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
  };

  const viewportClass = [styles.viewport, viewportClassName].filter(Boolean).join(" ");
  const content =
    as === "pre" ? (
      <pre
        ref={(node) => {
          viewportRef.current = node;
        }}
        className={viewportClass}
        data-language={dataLanguage || undefined}
        tabIndex={0}
      >
        {children}
      </pre>
    ) : (
      <div
        ref={(node) => {
          viewportRef.current = node;
        }}
        className={viewportClass}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
    );

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-code-block={codeBlock || undefined}
    >
      {content}
      <div
        ref={trackRef}
        className={styles.track}
        // 커서가 이 표시를 보고 스크롤바 모양이 된다. 이름은 pointer-chrome-contract.ts 가
        // 정의하지만 shared 레이어는 feature 를 import 할 수 없어 여기서는 리터럴로 적는다.
        data-custom-horizontal-scrollbar-ui
        data-visible="false"
        aria-hidden="true"
        onPointerDown={(event) => {
          const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
          drag.current = {
            id: event.pointerId,
            offset:
              event.target === thumbRef.current
                ? x - metrics.current.left
                : metrics.current.width / 2,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.dragging = "true";
          move(event.clientX);
        }}
        onPointerMove={(event) => {
          if (drag.current.id === event.pointerId) move(event.clientX);
        }}
        onPointerUp={(event) => {
          stopDragging(event.currentTarget, event.pointerId);
        }}
        onPointerCancel={(event) => {
          stopDragging(event.currentTarget, event.pointerId);
        }}
        onLostPointerCapture={(event) => {
          stopDragging(event.currentTarget, event.pointerId);
        }}
      >
        <span ref={thumbRef} className={styles.thumb} />
      </div>
    </div>
  );
};

export { HorizontalScrollArea };
