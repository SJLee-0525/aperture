"use client";

import { useEffect, useLayoutEffect } from "react";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

let lockCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

const acquireScrollLock = () => {
  const { body } = document;

  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    originalOverflow = body.style.overflow;
    originalPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }

  lockCount += 1;
};

const releaseScrollLock = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  const { body } = document;
  body.style.overflow = originalOverflow;
  body.style.paddingRight = originalPaddingRight;
};

/**
 * 모달·오버레이가 열려 있는 동안 body 스크롤 잠금 (2개 이상 feature 공유 → hooks 승격).
 * body 는 상시 스크롤바(globals: overflow-y:scroll)를 갖는 스크롤 컨테이너라
 * overflow:hidden 으로 잠그면 스크롤바가 사라지며 콘텐츠가 우측으로 밀린다.
 * → 사라지는 스크롤바 폭을 padding-right 로 보정해 모달 열림 시 가로 흔들림을 제거.
 * (오버레이 스크롤바 환경에선 폭이 0이라 보정 없음.)
 */
const useScrollLock = (locked: boolean) => {
  useBrowserLayoutEffect(() => {
    if (!locked) return;

    acquireScrollLock();
    return releaseScrollLock;
  }, [locked]);
};

export { useScrollLock };
