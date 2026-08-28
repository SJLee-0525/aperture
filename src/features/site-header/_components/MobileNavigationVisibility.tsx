"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isScrollLockFixingBody } from "@/hooks/use-scroll-lock";

import { MOBILE_NAVIGATION_QUERY } from "@/constants/breakpoints";

const MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE = "data-mobile-navigation-hidden";
const MOBILE_MENU_OPEN_ATTRIBUTE = "data-mobile-menu-open";

const TOP_THRESHOLD = 16;
const HIDE_START = 96;
const HIDE_DISTANCE = 24;
const SHOW_DISTANCE = 48;

/**
 * 모바일에서 스크롤 방향에 따라 상·하단 내비게이션 chrome을 전환한다.
 * 잦은 scroll 값을 React 상태로 올리지 않고 루트 속성 하나만 변경해 하위 컴포넌트 리렌더를 피한다.
 */
const MobileNavigationVisibility = () => {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia(MOBILE_NAVIGATION_QUERY);
    let lastY = Math.max(window.scrollY, 0);
    let upwardDistance = 0;
    let downwardDistance = 0;
    let frame = 0;

    const show = () => root.removeAttribute(MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE);
    const update = () => {
      frame = 0;

      if (!media.matches) {
        show();
        return;
      }

      if (root.hasAttribute(MOBILE_MENU_OPEN_ATTRIBUTE)) {
        upwardDistance = 0;
        downwardDistance = 0;
        show();
        return;
      }

      // 모달 스크롤 잠금이 body를 fixed로 바꾸면 scrollY가 0으로 점프한다(해제 시 복원 점프).
      // 사용자 스크롤이 아니므로 lastY를 유지한 채 무시 — 해제 복원 후 delta가 0이 되어 chrome이 숨지 않는다.
      if (isScrollLockFixingBody()) return;

      const currentY = Math.max(window.scrollY, 0);
      const delta = currentY - lastY;
      lastY = currentY;

      if (currentY <= TOP_THRESHOLD) {
        upwardDistance = 0;
        downwardDistance = 0;
        show();
        return;
      }

      if (delta > 0) {
        downwardDistance += delta;
        upwardDistance = 0;

        if (currentY >= HIDE_START && downwardDistance >= HIDE_DISTANCE) {
          root.setAttribute(MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE, "");
          downwardDistance = 0;
        }
      } else if (delta < 0) {
        upwardDistance -= delta;
        downwardDistance = 0;

        if (upwardDistance >= SHOW_DISTANCE) {
          show();
          upwardDistance = 0;
        }
      }
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onMediaChange = () => {
      lastY = Math.max(window.scrollY, 0);
      upwardDistance = 0;
      downwardDistance = 0;
      if (!media.matches) show();
    };

    show();
    window.addEventListener("scroll", onScroll, { passive: true });
    media.addEventListener("change", onMediaChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      media.removeEventListener("change", onMediaChange);
      if (frame) window.cancelAnimationFrame(frame);
      show();
    };
  }, [pathname]);

  return null;
};

export {
  MOBILE_MENU_OPEN_ATTRIBUTE,
  MOBILE_NAVIGATION_HIDDEN_ATTRIBUTE,
  MobileNavigationVisibility,
};
