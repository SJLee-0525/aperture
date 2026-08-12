"use client";

import { useEffect, useState } from "react";

import { READING_BAND_ROOT_MARGIN } from "@/features/dev-blog/_lib/reading-line";

/**
 * 목차를 띄울 구간인지 판단한다 — 본문이 읽기 기준선에 걸쳐 있는 동안만 true 다.
 *
 * 히어로를 읽는 동안에는 목차가 아직 쓸모없고, 본문을 지나 연관 프로젝트·다른 글 표에
 * 닿으면 목차가 그 위를 덮는다. 본문 영역 하나만 같은 밴드로 관찰해 두 경우를 함께 처리한다.
 *
 * @param {string} selector 본문 래퍼를 찾을 CSS 선택자.
 * @returns {boolean} 본문 구간이면 true.
 */
const useTocZone = (selector: string): boolean => {
  const [inZone, setInZone] = useState(false);

  useEffect(() => {
    const zone = document.querySelector(selector);
    if (!zone) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInZone(Boolean(entry?.isIntersecting)),
      { rootMargin: READING_BAND_ROOT_MARGIN },
    );
    observer.observe(zone);
    return () => observer.disconnect();
  }, [selector]);

  return inZone;
};

export { useTocZone };
