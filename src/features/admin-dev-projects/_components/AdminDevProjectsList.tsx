"use client";

import { ProjectRow } from "@/features/admin-dev-projects/_components/ProjectRow";
import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

import { adminNewRoute, ROUTES } from "@/constants/routes";
import { getDevProjectRepository } from "@/lib/admin/dev-project-repository";

/**
 * 관리자 프로젝트 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 */
const AdminDevProjectsList = () => (
  <AdminSortableListPage
    noun="프로젝트"
    newHref={adminNewRoute(ROUTES.ADMIN_DEV_PROJECTS)}
    getRepository={getDevProjectRepository}
    renderRow={({ item, publishBusy, onTogglePublished, onDelete }) => (
      <ProjectRow
        key={item.id}
        project={item}
        publishBusy={publishBusy}
        onTogglePublished={onTogglePublished}
        onDelete={onDelete}
      />
    )}
  />
);

export default AdminDevProjectsList;
