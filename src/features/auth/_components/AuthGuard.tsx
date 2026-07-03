"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/_hooks/use-auth";

import styles from "./AuthGuard.module.css";

type Props = { children: ReactNode };

/**
 * 관리자 라우트 가드. 로그인 페이지(/admin/login)는 통과, 그 외는 관리자만.
 * ⚠️ UX 가드일 뿐 — 실제 보안 경계는 Firestore/Storage Rules 다 (아키텍처 원칙 #1).
 */
const AuthGuard = ({ children }: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAdmin } = useAuth();
  const isLoginRoute = pathname === ROUTES.LOGIN;

  useEffect(() => {
    if (loading || isLoginRoute) return;
    if (!isAdmin) router.replace(ROUTES.LOGIN);
  }, [loading, isAdmin, isLoginRoute, router]);

  // 로그인 페이지는 가드 없이 렌더.
  if (isLoginRoute) return <>{children}</>;
  // 판별 전 또는 리다이렉트 대기 중 → 빈 게이트.
  if (loading || !isAdmin) return <div className={styles.gate} aria-busy="true" />;
  return <>{children}</>;
};

export { AuthGuard };
