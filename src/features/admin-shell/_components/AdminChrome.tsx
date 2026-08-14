"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { signOutAdmin } from "@/lib/firebase/auth";

import type { ReactNode } from "react";

import styles from "./AdminChrome.module.css";
import { MockModeBadge } from "./MockModeBadge";

/**
 * 인증된 관리자 화면의 공통 크롬 — 상단 바(브랜드·사이트 보기·로그아웃) + mock 안내 + 컨텐츠 영역.
 *
 * @param {{ children: ReactNode }} props
 * @param {ReactNode} props.children
 * @returns {JSX.Element}
 */
const AdminChrome = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  const onLogout = async () => {
    await signOutAdmin();
    router.replace(ROUTES.LOGIN);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link href={ROUTES.ADMIN} className={styles.brand}>
          Sungjoon Lee.<span className={styles.tag}>관리자</span>
        </Link>
        <div className={styles.right}>
          <Link href={ROUTES.LANDING} className={styles.link}>
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

export { AdminChrome };
