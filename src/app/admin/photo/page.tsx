import { AdminHubGrid } from "@/features/admin-shell/_components/AdminHubGrid";

import { ROUTES } from "@/constants/routes";

import type { HubCard } from "@/features/admin-shell/_components/AdminHubGrid";

const SECTIONS: HubCard[] = [
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

/**
 * 사진 섹션 허브 — 세부 관리 화면으로 나눠 보낸다.
 *
 * @returns {JSX.Element}
 */
const AdminPhotoPage = () => <AdminHubGrid title="사진" lead="작업·앨범·태그·소개를 관리합니다." cards={SECTIONS} />;

export default AdminPhotoPage;
