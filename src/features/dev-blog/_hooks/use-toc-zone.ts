"use client";

import { useEffect, useState } from "react";

import { observeReadingLine } from "@/features/dev-blog/_lib/observe-reading-line";
import { READING_LINE_PX } from "@/features/dev-blog/_lib/reading-line";

/**
 * 목차를 띄울 구간인지 판단한다 — 본문이 읽기 기준선에 걸쳐 있는 동안만 true 다.
 *
 * 히어로를 읽는 동안에는 목차가 아직 쓸모없고, 본문을 지나 연관 프로젝트·다른 글 표에
 * 닿으면 목차가 그 위를 덮는다. 본문 영역 하나를 기준선과 비교해 두 경우를 함께 처리한다.
 *
 * @param selector 본문 래퍼를 찾을 CSS 선택자.
 * @returns 본문 구간이면 true.
 */
const useTocZone = (selector: string): boolean => {
  const [inZone, setInZone] = useState(false);

  useEffect(() => {
    const zone = document.querySelector(selector);
    if (!zone) return;

    // 프레임마다 도는 경로다. 값이 그대로면 상태를 건드리지 않는다.
    let current = false;

    return observeReadingLine(() => {
      const { top, bottom } = zone.getBoundingClientRect();
      const next = top <= READING_LINE_PX && bottom > READING_LINE_PX;
      if (next === current) return;
      current = next;
      setInZone(next);
    });
  }, [selector]);

  return inZone;
};

export { useTocZone };
