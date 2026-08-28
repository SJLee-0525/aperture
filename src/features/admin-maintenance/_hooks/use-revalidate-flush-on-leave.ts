"use client";

import { useEffect } from "react";

import { flushPendingRevalidateToFailureStore } from "@/lib/cache/request-revalidate";

/**
 * 관리자가 페이지를 떠날 때 아직 끝나지 않은 재검증을 처리한다.
 *
 * `pagehide` 는 `beforeunload` 와 달리 모바일 Safari 에서도 발생하고, 뒤로 가기 캐시로
 * 들어가는 이동까지 잡는다. 후자는 페이지가 살아 있으므로 `persisted` 를 그대로 넘겨
 * 실패로 기록하지 않게 한다.
 */
const useRevalidateFlushOnLeave = (): void => {
  useEffect(() => {
    const flush = (event: PageTransitionEvent) =>
      flushPendingRevalidateToFailureStore({ persisted: event.persisted });
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
};

export { useRevalidateFlushOnLeave };
