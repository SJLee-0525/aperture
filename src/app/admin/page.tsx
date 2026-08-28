"use client";

import { AdminHubGrid } from "@/features/admin-shell/_components/AdminHubGrid";

import { useAuth } from "@/features/auth/_hooks/use-auth";

import { ROUTES } from "@/constants/routes";

import type { HubCard } from "@/features/admin-shell/_components/AdminHubGrid";

/** 관리자 섹션 허브 — 섹션 단위로 묶고 각 허브에서 세부 관리로 진입. */
const SECTIONS: HubCard[] = [
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
    label: "랜딩 · 문의",
    desc: "메인 순환 타이핑·리드 · 문의 리드·링크",
    href: ROUTES.ADMIN_GLOBAL,
  },
  {
    key: "maintenance",
    label: "데이터 관리",
    desc: "이미지 썸네일 · 앨범 커버 마이그레이션",
    href: ROUTES.ADMIN_MAINTENANCE,
  },
];

const AdminHomePage = () => {
  const { user } = useAuth();

  return (
    <AdminHubGrid
      title="대시보드"
      lead={`${user?.email ?? "관리자"} 님, 환영합니다.`}
      cards={SECTIONS}
    />
  );
};

export default AdminHomePage;
