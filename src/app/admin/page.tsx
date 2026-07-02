"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/use-auth";

import styles from "./page.module.css";

/** 관리자 섹션 — href 가 있으면 링크 카드, 없으면 "곧 제공". */
const SECTIONS: { key: string; label: string; desc: string; href?: string }[] = [
  {
    key: "photos",
    label: "사진",
    desc: "업로드 · EXIF 자동추출 · 좌표 · 태그 · 드래그 정렬",
    href: ROUTES.ADMIN_PHOTOS,
  },
  {
    key: "albums",
    label: "앨범",
    desc: "사진 묶음 · 커버 · 표시 순서",
    href: ROUTES.ADMIN_ALBUMS,
  },
  { key: "tags", label: "태그 사전", desc: "필터 칩 ko/en 정의", href: ROUTES.ADMIN_TAGS },
  { key: "site", label: "소개", desc: "이름 · 바이오 · 연락처 링크", href: ROUTES.ADMIN_SITE },
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
