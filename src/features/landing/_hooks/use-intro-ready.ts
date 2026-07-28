"use client";

import { useEffect, useState } from "react";

const useIntroReady = (): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    const splash = document.querySelector<HTMLElement>("[data-intro-splash]");
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

    splash.addEventListener("animationend", start, { once: true });
    const fallback = window.setTimeout(
      start,
      (parseFloat(computedStyle.animationDuration) || 1.4) * 1000 + 300,
    );
    return () => {
      splash.removeEventListener("animationend", start);
      window.clearTimeout(fallback);
    };
  }, []);

  return ready;
};

export { useIntroReady };
