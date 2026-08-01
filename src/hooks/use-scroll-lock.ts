"use client";

import { useEffect, useLayoutEffect } from "react";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

let lockCount = 0;
let lockedScrollX = 0;
let lockedScrollY = 0;
let bodyWasFixed = false;
let originalRootOverflow = "";
let originalBodyStyles = {
  overflow: "",
  paddingRight: "",
  position: "",
  top: "",
  left: "",
  width: "",
};

const acquireScrollLock = () => {
  const { body, documentElement } = document;

  if (lockCount === 0) {
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    lockedScrollX = window.scrollX;
    lockedScrollY = window.scrollY;
    bodyWasFixed = window.innerWidth <= 767;
    originalRootOverflow = documentElement.style.overflow;
    originalBodyStyles = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
    };

    if (bodyWasFixed) documentElement.style.overflow = "hidden";
    Object.assign(body.style, {
      overflow: "hidden",
    });
    if (bodyWasFixed) {
      Object.assign(body.style, {
        position: "fixed",
        top: `${-lockedScrollY}px`,
        left: `${-lockedScrollX}px`,
        width: "100%",
      });
    }
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }

  lockCount += 1;
};

const releaseScrollLock = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  const { body, documentElement } = document;
  documentElement.style.overflow = originalRootOverflow;
  Object.assign(body.style, originalBodyStyles);
  if (bodyWasFixed && (lockedScrollX !== 0 || lockedScrollY !== 0)) {
    window.scrollTo(lockedScrollX, lockedScrollY);
  }
};

/**
 * 모달·오버레이가 열려 있는 동안 root와 body 스크롤 잠금 (2개 이상 feature 공유 → hooks 승격).
 * 모바일 Safari의 스크롤 루트와 rubber-band를 막기 위해 root overflow와 body fixed를 함께 쓴다.
 * 데스크톱에서는 sticky header가 유지되도록 body를 고정하지 않고 overflow만 잠근다.
 * body 는 상시 스크롤바(globals: overflow-y:scroll)를 갖기 때문에
 * 잠글 때 스크롤바가 사라지며 콘텐츠가 우측으로 밀린다.
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
