import { AdminHubGrid } from "@/features/admin-shell/_components/AdminHubGrid";

import { ROUTES } from "@/constants/routes";

import type { HubCard } from "@/features/admin-shell/_components/AdminHubGrid";

const SECTIONS: HubCard[] = [
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
 * 개발 섹션 허브 — 세부 관리 화면으로 나눠 보낸다.
 */
const AdminDevPage = () => <AdminHubGrid title="개발" lead="프로젝트·블로그와 소개 설정을 관리합니다." cards={SECTIONS} />;

export default AdminDevPage;
