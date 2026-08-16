import Link from "next/link";

import { ROUTES } from "@/constants/routes";

import styles from "./page.module.css";

const SECTIONS: { key: string; label: string; desc: string; href: string }[] = [
  {
    key: "works",
    label: "연주",
    desc: "포스터 · 프로그램 · 예매 · 드래그 정렬",
    href: ROUTES.ADMIN_MUSIC_WORKS,
  },
  {
    key: "awards",
    label: "수상",
    desc: "연도 · 대회 · 수상 내역",
    href: ROUTES.ADMIN_MUSIC_AWARDS,
  },
  {
    key: "media",
    label: "영상",
    desc: "YouTube 임베드 · 출처",
    href: ROUTES.ADMIN_MUSIC_MEDIA,
  },
  {
    key: "config",
    label: "소개",
    desc: "소개글 · 경력 · 학력 타임라인",
    href: ROUTES.ADMIN_MUSIC_CONFIG,
  },
];

/**
 * 음악 관리자 허브 — 연주·수상·영상·설정 4개 카드.
 *
 * @returns {JSX.Element}
 */
const AdminMusicPage = () => (
  <div className={styles.page}>
    <header className={styles.head}>
      <h1 className={styles.title}>음악</h1>
      <p className={styles.hint}>연주·수상·영상·소개를 관리합니다.</p>
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

export default AdminMusicPage;
