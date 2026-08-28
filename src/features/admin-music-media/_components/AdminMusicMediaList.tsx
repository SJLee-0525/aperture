"use client";

import { MediaRow } from "@/features/admin-music-media/_components/MediaRow";
import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

import { adminNewRoute, ROUTES } from "@/constants/routes";
import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";

/**
 * 관리자 영상 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 */
const AdminMusicMediaList = () => (
  <AdminSortableListPage
    noun="영상"
    newHref={adminNewRoute(ROUTES.ADMIN_MUSIC_MEDIA)}
    getRepository={getMusicMediaRepository}
    renderRow={({ item, publishBusy, onTogglePublished, onDelete }) => (
      <MediaRow
        key={item.id}
        media={item}
        publishBusy={publishBusy}
        onTogglePublished={onTogglePublished}
        onDelete={onDelete}
      />
    )}
  />
);

export default AdminMusicMediaList;
