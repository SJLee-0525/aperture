"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { RagStaleBanner } from "@/features/admin-maintenance/_components/RagStaleBanner";
import { AdminChrome } from "@/features/admin-shell/_components/AdminChrome";
import { AuthGuard } from "@/features/auth/_components/AuthGuard";
import { AdminMonitoring } from "@/features/monitoring/_components/AdminMonitoring";

/**
 * 관리자 클라이언트 셸. 서버 레이아웃은 noindex 메타데이터를 내보내고,
 * 경로에 따른 로그인/관리자 크롬 분기는 이 컴포넌트가 담당한다.
 *
 * @param {{ children: ReactNode }} props
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
const AdminLayoutClient = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  if (pathname === ROUTES.LOGIN) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      {/* AuthGuard가 관리자 UID를 확인한 뒤에만 동의 없는 운영자 모니터링을 시작한다. */}
      <AdminMonitoring />
      <AdminChrome>
        <RagStaleBanner />
        {children}
      </AdminChrome>
    </AuthGuard>
  );
};

export { AdminLayoutClient };
