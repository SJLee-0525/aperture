"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";

import styles from "./page.module.css";

const SECTIONS: { key: string; label: string; desc: string; href: string }[] = [
  {
    key: "photos",
    label: "작업",
    desc: "업로드 · EXIF 자동추출 · 좌표 · 태그 · 드래그 정렬",
    href: ROUTES.ADMIN_PHOTOS,
  },
  {
    key: "albums",
    label: "앨범",
    desc: "사진 묶음 · 커버 · 표시 순서",
    href: ROUTES.ADMIN_ALBUMS,
  },
  {
    key: "tags",
    label: "태그 사전",
    desc: "필터 칩 ko/en 정의",
    href: ROUTES.ADMIN_TAGS,
  },
  {
    key: "site",
    label: "소개",
    desc: "소개 페이지(/photo/about) 바이오",
    href: ROUTES.ADMIN_SITE,
  },
];

const AdminPhotoPage = () => (
  <div className={styles.page}>
    <header className={styles.head}>
      <h1 className={styles.title}>사진</h1>
      <p className={styles.hint}>작업·앨범·태그·소개를 관리합니다.</p>
    </header>

    <div className={styles.grid}>
      {SECTIONS.map((section) => (
        <Link key={section.key} href={section.href} className={styles.card}>
          <span className={styles.badge}>관리 →</span>
          <h2 className={styles.cardTitle}>{section.label}</h2>
          <p className={styles.cardDesc}>{section.desc}</p>
        </Link>
      ))}
    </div>
  </div>
);

export default AdminPhotoPage;
