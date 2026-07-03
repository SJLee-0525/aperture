"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/_hooks/use-auth";

import styles from "./page.module.css";

/** 관리자 섹션 허브 — 섹션 단위로 묶고 각 허브에서 세부 관리로 진입. href 없으면 "곧 제공". */
const SECTIONS: { key: string; label: string; desc: string; href?: string }[] = [
  {
    key: "photo",
    label: "사진",
    desc: "작업 · 앨범 · 태그 · 소개",
    href: ROUTES.ADMIN_PHOTO,
  },
  {
    key: "music",
    label: "음악",
    desc: "연주 · 수상 · 영상 · 소개",
    href: ROUTES.ADMIN_MUSIC,
  },
  {
    key: "dev",
    label: "개발",
    desc: "프로젝트 · 소개",
    href: ROUTES.ADMIN_DEV,
  },
  {
    key: "global",
    label: "랜딩 · 연락",
    desc: "메인 순환 타이핑·리드 · 연락 리드·링크",
    href: ROUTES.ADMIN_GLOBAL,
  },
];

const AdminHomePage = () => {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>대시보드</h1>
        <p className={styles.hello}>{user?.email ?? "관리자"} 님, 환영합니다.</p>
      </header>

      <div className={styles.grid}>
        {SECTIONS.map((section) =>
          section.href ? (
            <Link
              key={section.key}
              href={section.href}
              className={`${styles.card} ${styles.cardLink}`}
            >
              <span className={`${styles.badge} ${styles.badgeReady}`}>관리 →</span>
              <h2 className={styles.cardTitle}>{section.label}</h2>
              <p className={styles.cardDesc}>{section.desc}</p>
            </Link>
          ) : (
            <div key={section.key} className={styles.card}>
              <span className={styles.badge}>곧 제공</span>
              <h2 className={styles.cardTitle}>{section.label}</h2>
              <p className={styles.cardDesc}>{section.desc}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export default AdminHomePage;
