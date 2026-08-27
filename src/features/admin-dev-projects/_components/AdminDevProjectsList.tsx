"use client";

import { ProjectRow } from "@/features/admin-dev-projects/_components/ProjectRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { ROUTES } from "@/constants/routes";
import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";

/**
 * 관리자 프로젝트 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminDevProjectsList = () => {
  const { items, status, error, reorder, togglePublished, remove } =
    useOrderedAdmin(getDevProjectRepository());

  return (
    <AdminListShell
      title="프로젝트"
      hint="드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다."
      newHref={ROUTES.ADMIN_DEV_PROJECT_NEW}
      newLabel="+ 새 프로젝트"
      emptyLabel="아직 프로젝트가 없습니다."
      emptyCtaLabel="+ 첫 프로젝트 만들기"
      status={status}
      error={error}
      errorFallback="프로젝트를 불러오지 못했습니다."
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) => (
          <ProjectRow
            key={item.id}
            project={item}
            onTogglePublished={togglePublished}
            onDelete={remove}
          />
        ))}
      </AdminSortableList>
    </AdminListShell>
  );
};

export default AdminDevProjectsList;
