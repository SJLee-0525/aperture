"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/features/auth/_hooks/use-auth";

import { ROUTES } from "@/constants/routes";

import styles from "./AuthGuard.module.css";

type Props = { children: ReactNode };

/**
 * 관리자 라우트 가드. 로그인 페이지(/admin/login)는 통과, 그 외는 관리자만.
 * ⚠️ UX 가드일 뿐이다. 실제 보안 경계는 Supabase RLS 다 (ADR-0005).
 *
 * 테스트 전용 세션 판정은 `useAuth` 가 소유한다 — 구독을 열지 말지와 화면을 열지 말지가
 * 같은 값에서 갈려야 둘이 어긋나지 않는다. 그 세션에서도 `isAdmin` 은 false 로 남는다.
 * 실제 Supabase 토큰이 필요한 화면은 여전히 실패해야 하고, 그 실패가
 * "테스트에서만 되는 관리자 기능"을 만들지 않는 장치다.
 *
 * @param {Props} props
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
const AuthGuard = ({ children }: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAdmin, testSession } = useAuth();
  const isLoginRoute = pathname === ROUTES.LOGIN;
  const allowed = isAdmin || testSession;

  useEffect(() => {
    if (loading || isLoginRoute) return;
    if (!allowed) router.replace(ROUTES.LOGIN);
  }, [loading, allowed, isLoginRoute, router]);

  // 로그인 페이지는 가드 없이 렌더.
  if (isLoginRoute) return <>{children}</>;
  // 판별 전 또는 리다이렉트 대기 중 → 빈 게이트.
  if (loading || !allowed) return <div className={styles.gate} aria-busy="true" />;
  return <>{children}</>;
};

export { AuthGuard };
