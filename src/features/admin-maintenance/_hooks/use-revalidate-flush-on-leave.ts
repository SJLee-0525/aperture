"use client";

import { useEffect } from "react";

import { flushPendingRevalidateToFailureStore } from "@/lib/cache/request-revalidate";

/**
 * 관리자가 페이지를 떠날 때 아직 끝나지 않은 재검증을 실패 기록으로 남긴다.
 *
 * `pagehide` 는 뒤로 가기 캐시로 들어가는 이동까지 잡는다. `beforeunload` 와 달리
 * 모바일 Safari 에서도 발생한다. 리스너는 관리자 셸 한 곳에서만 등록한다.
 *
 * @returns {void}
 */
const useRevalidateFlushOnLeave = (): void => {
  useEffect(() => {
    const flush = () => flushPendingRevalidateToFailureStore();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
};

export { useRevalidateFlushOnLeave };
