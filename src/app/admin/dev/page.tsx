import Link from "next/link";

import styles from "@/features/admin-shell/_components/admin-hub.module.css";

import { ROUTES } from "@/constants/routes";

const SECTIONS: { key: string; label: string; desc: string; href: string }[] = [
  {
    key: "projects",
    label: "프로젝트",
    desc: "개요 · 담당 · 트러블슈팅 · 이미지 · 드래그 정렬",
    href: ROUTES.ADMIN_DEV_PROJECTS,
  },
  {
    key: "articles",
    label: "블로그",
    desc: "Markdown 본문 · 태그 · 발행일 · 연관 프로젝트",
    href: ROUTES.ADMIN_DEV_ARTICLES,
  },
  {
    key: "config",
    label: "소개",
    desc: "히어로 · 인터뷰 · 기술 스택 · 경력 · 연락처",
    href: ROUTES.ADMIN_DEV_CONFIG,
  },
];

/**
 * 개발 관리자 허브 — 프로젝트·블로그·설정 3개 카드.
 *
 * @returns {JSX.Element}
 */
const AdminDevPage = () => (
  <div className={styles.page}>
    <header className={styles.head}>
      <h1 className={styles.title}>개발</h1>
      <p className={styles.hint}>프로젝트·블로그와 소개 설정을 관리합니다.</p>
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

export default AdminDevPage;
