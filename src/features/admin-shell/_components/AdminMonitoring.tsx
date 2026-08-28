"use client";

import { useEffect } from "react";

import { startBrowserMonitoring, stopBrowserMonitoring } from "@/lib/monitoring/browser-monitoring";

/**
 * 인증된 관리자 콘텐츠에 Sentry 모니터링을 연결한다. AdminLayoutClient의 AuthGuard 안에서만 사용한다.
 *
 * 관리자 UID 확인을 통과한 운영자 본인에게만 동의 배너 없이 켠다(ADR-0004).
 * 컨트롤러는 admin 모드에서 Replay를 사용하지 않는다. 로그인 폼과 미공개
 * 초안을 녹화에 남기지 않는다. DSN 미설정이면 컨트롤러가 no-op이다.
 *
 * 로그인 화면이나 공개 트리로 이동할 때는 클라이언트를 먼저 닫는다. 공개 트리에서
 * 오류 보고가 허용돼 있으면 AnalyticsConsentProvider가 public 모드로 다시 시작한다.
 *
 * @returns UI를 렌더하지 않는다.
 */
const AdminMonitoring = () => {
  useEffect(() => {
    void startBrowserMonitoring("admin");
    return () => {
      void stopBrowserMonitoring();
    };
  }, []);

  return null;
};

export { AdminMonitoring };
