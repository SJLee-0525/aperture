"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { AdminChrome } from "@/features/admin-shell/AdminChrome";
import { AuthGuard } from "@/features/auth/AuthGuard";

/**
 * 관리자 레이아웃 — AuthGuard 마운트는 여기 한 곳에서만 (CLAUDE.md 디렉토리 원칙).
 * 로그인 페이지는 크롬 없이, 그 외 인증된 페이지는 AdminChrome 안에 렌더.
 */
const AdminLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  if (pathname === ROUTES.LOGIN) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <AdminChrome>{children}</AdminChrome>
    </AuthGuard>
  );
};

export default AdminLayout;
