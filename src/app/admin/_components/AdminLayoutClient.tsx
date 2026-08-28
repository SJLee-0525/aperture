"use client";

import { usePathname } from "next/navigation";

import { RagStaleBanner } from "@/features/admin-maintenance/_components/RagStaleBanner";
import { RevalidateFailureBanner } from "@/features/admin-maintenance/_components/RevalidateFailureBanner";
import { AdminChrome } from "@/features/admin-shell/_components/AdminChrome";
import { AdminMonitoring } from "@/features/admin-shell/_components/AdminMonitoring";
import { AuthGuard } from "@/features/auth/_components/AuthGuard";

import { useRevalidateFlushOnLeave } from "@/features/admin-maintenance/_hooks/use-revalidate-flush-on-leave";

import { ROUTES } from "@/constants/routes";
import { shouldUseMockContent } from "@/lib/content/content-source";

import type { ReactNode } from "react";

/**
 * 관리자 클라이언트 셸. 서버 레이아웃은 noindex 메타데이터를 내보내고,
 * 경로에 따른 로그인/관리자 크롬 분기는 이 컴포넌트가 담당한다.
 */
const AdminLayoutClient = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  useRevalidateFlushOnLeave();

  if (pathname === ROUTES.LOGIN) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      {/* AuthGuard가 관리자 UID를 확인한 뒤에만 동의 없는 운영자 모니터링을 시작한다. */}
      <AdminMonitoring />
      <AdminChrome>
        {/* RAG 잔류 감지는 실제 DB·임베딩 API 를 조회한다. mock 모드에서는 조회 대상이 없다. */}
        {shouldUseMockContent() ? null : <RagStaleBanner />}
        {/* 재검증은 mock 모드에서도 요청하지 않으므로 실패 기록 자체가 남지 않는다. */}
        <RevalidateFailureBanner />
        {children}
      </AdminChrome>
    </AuthGuard>
  );
};

export { AdminLayoutClient };
