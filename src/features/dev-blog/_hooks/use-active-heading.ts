"use client";

import { useEffect, useState } from "react";

import { READING_BAND_ROOT_MARGIN } from "@/features/dev-blog/_lib/reading-line";

/**
 * 지금 읽고 있는 heading 의 id 를 추적한다.
 *
 * heading 마다 스크롤 리스너를 다는 대신 `IntersectionObserver` 하나로 전부 관찰한다. 판정은
 * "읽기 기준선을 이미 지난 heading 중 문서상 마지막"이다. 화면에 보이는 heading 을 고르는 방식은
 * 짧은 절이 이어질 때 두 제목이 동시에 보이면서 현재 항목이 오르내린다.
 *
 * 관찰을 시작하면 브라우저가 모든 대상에 한 번씩 알려 주므로, fragment 로 바로 들어온 경우에도
 * 첫 판정이 맞는다.
 *
 * @param {readonly string[]} ids 문서 순서대로의 heading id.
 * @returns {string | null} 현재 heading id. 아직 첫 heading 위쪽이면 null.
 */
const useActiveHeading = (ids: readonly string[]): string | null => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const key = ids.join("|");

  useEffect(() => {
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const passed = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const top = entry.rootBounds?.top ?? 0;
          // 밴드 안에 있거나 이미 위로 지나갔으면 "읽은" 것으로 센다.
          const isPassed = entry.isIntersecting || entry.boundingClientRect.top < top;
          if (isPassed) passed.add(entry.target.id);
          else passed.delete(entry.target.id);
        }
        const last = ids.filter((id) => passed.has(id)).at(-1) ?? null;
        setActiveId(last);
      },
      { rootMargin: READING_BAND_ROOT_MARGIN },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
    // ids 배열은 렌더마다 새로 만들어질 수 있어 값으로 비교한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
};

export { useActiveHeading };
