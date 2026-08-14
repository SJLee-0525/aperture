"use client";

import { useEffect, useState } from "react";

import { observeReadingLine } from "@/features/dev-blog/_lib/observe-reading-line";
import { READING_LINE_PX } from "@/features/dev-blog/_lib/reading-line";

/**
 * 지금 읽고 있는 heading 의 id 를 추적한다.
 *
 * 판정은 "읽기 기준선을 이미 지난 heading 중 문서상 마지막"이다. 화면에 보이는 heading 을 고르는
 * 방식은 짧은 절이 이어질 때 두 제목이 동시에 보이면서 현재 항목이 오르내린다.
 *
 * 위치는 프레임마다 직접 잰다. 이유는 `observeReadingLine` 에 적어 두었다.
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

    // 프레임마다 도는 경로다. 값이 그대로면 상태를 건드리지 않는다.
    // 아직 재지 않은 상태를 `null` 과 구분해야, 목록이 바뀌어 다시 구독할 때 첫 측정이
    // 직전 글의 id 를 남긴 채 건너뛰지 않는다.
    let current: string | null | undefined;

    return observeReadingLine(() => {
      // 문서 순서대로 담긴 목록을 뒤에서부터 훑어 기준선을 지난 첫 heading 에서 멈춘다.
      let found: string | null = null;
      for (let index = targets.length - 1; index >= 0; index -= 1) {
        if (targets[index].getBoundingClientRect().top <= READING_LINE_PX) {
          found = targets[index].id;
          break;
        }
      }
      if (found === current) return;
      current = found;
      setActiveId(found);
    });
    // ids 배열은 렌더마다 새로 만들어질 수 있어 값으로 비교한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
};

export { useActiveHeading };
