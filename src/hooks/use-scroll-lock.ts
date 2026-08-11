"use client";

import { useEffect, useLayoutEffect } from "react";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type NormalizedScrollLockOptions = Required<ScrollLockOptions>;

const activeLocks = new Map<symbol, NormalizedScrollLockOptions>();
let lockedScrollX = 0;
let lockedScrollY = 0;
let bodyIsFixed = false;
let bodyWasFixedDuringLock = false;
let originalRootOverflow = "";
let originalBodyStyles = {
  overflow: "",
  paddingRight: "",
  position: "",
  top: "",
  left: "",
  width: "",
};

type ScrollLockOptions = {
  fixBodyOnMobile?: boolean;
  lockRootOnMobile?: boolean;
};

const normalizeOptions = ({
  fixBodyOnMobile = true,
  lockRootOnMobile = true,
}: ScrollLockOptions): NormalizedScrollLockOptions => ({
  fixBodyOnMobile,
  lockRootOnMobile,
});

/** 활성 잠금 중 가장 나중에 등록된 항목을 반환한다. */
const topLock = (): NormalizedScrollLockOptions | undefined => [...activeLocks.values()].at(-1);

/**
 * 현재 최상위 오버레이의 옵션을 root와 body에 반영한다.
 * 아래 오버레이의 잠금은 Map에 남겨 두었다가 최상위 잠금이 해제되면 복원한다.
 */
const applyActiveLock = () => {
  const { body, documentElement } = document;
  const options = topLock();

  if (!options) {
    documentElement.style.overflow = originalRootOverflow;
    Object.assign(body.style, originalBodyStyles);
    bodyIsFixed = false;
    if (bodyWasFixedDuringLock && (lockedScrollX !== 0 || lockedScrollY !== 0)) {
      window.scrollTo(lockedScrollX, lockedScrollY);
    }
    bodyWasFixedDuringLock = false;
    return;
  }

  const mobile = window.innerWidth <= 767;
  const shouldFixBody = mobile && options.fixBodyOnMobile;
  const wasFixed = bodyIsFixed;

  documentElement.style.overflow =
    mobile && options.lockRootOnMobile ? "hidden" : originalRootOverflow;
  body.style.overflow = "hidden";

  if (shouldFixBody) {
    Object.assign(body.style, {
      position: "fixed",
      top: `${-lockedScrollY}px`,
      left: `${-lockedScrollX}px`,
      width: "100%",
    });
    bodyWasFixedDuringLock = true;
  } else {
    Object.assign(body.style, {
      position: originalBodyStyles.position,
      top: originalBodyStyles.top,
      left: originalBodyStyles.left,
      width: originalBodyStyles.width,
    });
    // fixed body 아래에서 열린 키보드 대응 오버레이는 문서 offset을 상속하면 안 된다.
    if (wasFixed) window.scrollTo(0, 0);
  }
  bodyIsFixed = shouldFixBody;
};

const acquireScrollLock = (options: ScrollLockOptions): (() => void) => {
  const { body, documentElement } = document;
  const token = Symbol("scroll-lock");

  if (activeLocks.size === 0) {
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    lockedScrollX = window.scrollX;
    lockedScrollY = window.scrollY;
    originalRootOverflow = documentElement.style.overflow;
    originalBodyStyles = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
    };
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    window.addEventListener("resize", applyActiveLock);
  }

  activeLocks.set(token, normalizeOptions(options));
  applyActiveLock();

  return () => {
    if (!activeLocks.delete(token)) return;
    if (activeLocks.size === 0) window.removeEventListener("resize", applyActiveLock);
    applyActiveLock();
  };
};

/**
 * body가 fixed로 잠겨 window.scrollY가 실제 위치와 무관해진 상태인지 — 스크롤 관찰자가 잠금 중 점프를 무시할 때 사용.
 *
 * @returns {boolean}
 */
const isScrollLockFixingBody = () => activeLocks.size > 0 && bodyIsFixed;

/**
 * 모달·오버레이가 열려 있는 동안 root와 body 스크롤 잠금 (2개 이상 feature 공유 → hooks 승격).
 * 모바일 Safari의 스크롤 루트와 rubber-band를 막기 위해 root overflow와 body fixed를 함께 쓴다.
 * 데스크톱에서는 sticky header가 유지되도록 body를 고정하지 않고 overflow만 잠근다.
 * body 는 상시 스크롤바(globals: overflow-y:scroll)를 갖기 때문에
 * 잠글 때 스크롤바가 사라지며 콘텐츠가 우측으로 밀린다.
 * → 사라지는 스크롤바 폭을 padding-right 로 보정해 모달 열림 시 가로 흔들림을 제거.
 * (오버레이 스크롤바 환경에선 폭이 0이라 보정 없음.)
 *
 * @param {boolean} locked
 * @param {ScrollLockOptions} [options]
 * @returns {void}
 */
const useScrollLock = (locked: boolean, options: ScrollLockOptions = {}) => {
  useBrowserLayoutEffect(() => {
    if (!locked) return;

    return acquireScrollLock(options);
  }, [locked, options.fixBodyOnMobile, options.lockRootOnMobile]);
};

export { isScrollLockFixingBody, useScrollLock };
