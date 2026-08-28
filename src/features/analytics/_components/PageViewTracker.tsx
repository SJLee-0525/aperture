"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { analyticsQuery } from "@/features/analytics/_lib/analytics-query";
import { sendPageView } from "@/features/analytics/_lib/gtag";

/**
 * 관리자(본인 1명) 트래픽은 방문자 통계가 아니다 — `/admin/*` 은 집계에서 제외한다.
 */
const isTrackablePath = (pathname: string) => !pathname.startsWith("/admin");

/**
 * 라우트 변경마다 page_view 를 보낸다. 최초 마운트도 여기서 1회 보내므로
 * 동의 후 gtag config 의 자동 page_view 는 꺼져 있어야 중복 집계가 나지 않는다.
 *
 * `useSearchParams` 는 Suspense 밖에서 쓰면 상위 정적 페이지를 통째로 CSR 로 떨어뜨린다 —
 * 반드시 Suspense 안에서만 렌더할 것(GoogleAnalytics 가 감싼다).
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isTrackablePath(pathname)) return;

    // 허용 목록 밖 파라미터는 GA 로 보내지 않는다. 검색어가 page_location 에 실리던 경로다.
    const query = analyticsQuery(searchParams);
    sendPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}
