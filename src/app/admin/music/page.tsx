import { AdminHubGrid } from "@/features/admin-shell/_components/AdminHubGrid";

import { ROUTES } from "@/constants/routes";

import type { HubCard } from "@/features/admin-shell/_components/AdminHubGrid";

const SECTIONS: HubCard[] = [
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
 * 음악 섹션 허브 — 세부 관리 화면으로 나눠 보낸다.
 */
const AdminMusicPage = () => (
  <AdminHubGrid title="음악" lead="연주·수상·영상·소개를 관리합니다." cards={SECTIONS} />
);

export default AdminMusicPage;
