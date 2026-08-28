"use client";

import { AwardRow } from "@/features/admin-music-awards/_components/AwardRow";
import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

import { adminNewRoute, ROUTES } from "@/constants/routes";
import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";

/**
 * 관리자 수상 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 */
const AdminMusicAwardsList = () => (
  <AdminSortableListPage
    noun="수상"
    newHref={adminNewRoute(ROUTES.ADMIN_MUSIC_AWARDS)}
    getRepository={getMusicAwardRepository}
    renderRow={({ item, publishBusy, onTogglePublished, onDelete }) => (
      <AwardRow
        key={item.id}
        award={item}
        publishBusy={publishBusy}
        onTogglePublished={onTogglePublished}
        onDelete={onDelete}
      />
    )}
  />
);

export default AdminMusicAwardsList;
