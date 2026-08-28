"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useIdleSignOut } from "@/features/admin-shell/_hooks/use-idle-sign-out";

import { ROUTES } from "@/constants/routes";
import { signOutAdmin } from "@/lib/supabase/auth";

import type { ReactNode } from "react";

import styles from "./AdminChrome.module.css";
import { MockModeBadge } from "./MockModeBadge";
import { UnsavedGuardProvider, useUnsavedGuardContext } from "./UnsavedGuardProvider";

const AdminChromeBar = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const guard = useUnsavedGuardContext();

  const onLogout = useCallback(async () => {
    if (guard && !guard.confirmLeave()) return;
    await signOutAdmin();
    router.replace(ROUTES.LOGIN);
  }, [guard, router]);

  // 유휴 자동 로그아웃은 확인창을 띄우지 않는다. 자리를 비운 사이에 뜬 확인창은
  // 아무도 누르지 않아 세션이 그대로 열려 있게 된다.
  useIdleSignOut(
    useCallback(async () => {
      await signOutAdmin();
      router.replace(ROUTES.LOGIN);
    }, [router]),
  );

  const blockIfDirty = (event: { preventDefault: () => void }) => {
    if (guard && !guard.confirmLeave()) event.preventDefault();
  };

  return (
    <div className={styles.shell} data-admin-shell>
      <header className={styles.bar}>
        <Link href={ROUTES.ADMIN} className={styles.brand} onNavigate={blockIfDirty}>
          Sungjoon Lee.<span className={styles.tag}>관리자</span>
        </Link>
        <div className={styles.right}>
          <Link href={ROUTES.LANDING} className={styles.link} onNavigate={blockIfDirty}>
            사이트 보기 ↗
          </Link>
          <button type="button" className={styles.logout} onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <MockModeBadge />
      <main className={styles.content}>{children}</main>
    </div>
  );
};

/**
 * 인증된 관리자 화면의 공통 크롬. 상단 바(브랜드·사이트 보기·로그아웃)와 mock 안내,
 * 컨텐츠 영역을 얹는다. 미저장 가드가 상단 바 밖에도 필요해 provider 를 여기서 연다.
 */
const AdminChrome = ({ children }: { children: ReactNode }) => (
  <UnsavedGuardProvider>
    <AdminChromeBar>{children}</AdminChromeBar>
  </UnsavedGuardProvider>
);

export { AdminChrome };
