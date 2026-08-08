"use client";

import { useEffect, useState } from "react";

/** 진입 리빌이 다 끝나기까지의 여유(초) — 지연 이후 stagger 꼬리와 재생 시간을 덮는다. */
const SETTLE = 1.5;

/**
 * 진입 리빌이 끝난 뒤에는 지연을 0으로 낮춘다.
 * 언어 전환처럼 진입 이후의 재렌더에서 새로 붙은 노드가 1초 넘게 비어 보이는 걸 막는다.
 * 이미 끝난 CSS 애니메이션은 지연이 줄어도 활성 구간이 과거라 최종 상태에 그대로 머문다.
 *
 * @param {boolean} started
 * @param {number} delay
 * @returns {number}
 */
const useIntroDelay = (started: boolean, delay: number): number => {
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (!started || played) return;

    const timer = window.setTimeout(() => setPlayed(true), (delay + SETTLE) * 1000);
    return () => window.clearTimeout(timer);
  }, [delay, played, started]);

  return played ? 0 : delay;
};

export { useIntroDelay };
