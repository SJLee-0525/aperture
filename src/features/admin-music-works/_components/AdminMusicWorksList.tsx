"use client";

import { WorkRow } from "@/features/admin-music-works/_components/WorkRow";
import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

import { adminNewRoute, ROUTES } from "@/constants/routes";
import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";

/**
 * 관리자 연주 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminMusicWorksList = () => (
  <AdminSortableListPage
    noun="연주"
    newHref={adminNewRoute(ROUTES.ADMIN_MUSIC_WORKS)}
    getRepository={getMusicWorkRepository}
    renderRow={({ item, publishBusy, onTogglePublished, onDelete }) => (
      <WorkRow
        key={item.id}
        work={item}
        publishBusy={publishBusy}
        onTogglePublished={onTogglePublished}
        onDelete={onDelete}
      />
    )}
  />
);

export default AdminMusicWorksList;
