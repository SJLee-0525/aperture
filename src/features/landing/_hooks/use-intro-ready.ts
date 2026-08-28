"use client";

import { useEffect, useState } from "react";

const useIntroReady = (): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    const splash = document.querySelector<HTMLElement>("[data-intro-splash]");
    // 자손의 animationend 도 버블링으로 올라온다. { once: true } 는 자손 이벤트에도
    // 리스너를 떼므로 target 검사와 함께 쓸 수 없다. 직접 해제한다.
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== splash) return;
      splash?.removeEventListener("animationend", onAnimationEnd);
      start();
    };
    const computedStyle = splash && getComputedStyle(splash);
    const covering =
      !!computedStyle &&
      computedStyle.display !== "none" &&
      computedStyle.visibility !== "hidden" &&
      Number(computedStyle.opacity) > 0;

    if (!covering) {
      const frame = requestAnimationFrame(start);
      return () => cancelAnimationFrame(frame);
    }

    splash.addEventListener("animationend", onAnimationEnd);
    const fallback = window.setTimeout(
      start,
      (parseFloat(computedStyle.animationDuration) || 1.4) * 1000 + 300,
    );
    return () => {
      splash.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(fallback);
    };
  }, []);

  return ready;
};

export { useIntroReady };
