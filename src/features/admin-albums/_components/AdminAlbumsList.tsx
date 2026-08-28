"use client";

import { AlbumRow } from "@/features/admin-albums/_components/AlbumRow";
import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

import { adminNewRoute, ROUTES } from "@/constants/routes";
import { getAlbumRepository } from "@/lib/admin/album-repository";

import { imageThumbnailUrl } from "@/types/image";

/**
 * 관리자 앨범 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 */
const AdminAlbumsList = () => (
  <AdminSortableListPage
    noun="앨범"
    newHref={adminNewRoute(ROUTES.ADMIN_ALBUMS)}
    getRepository={getAlbumRepository}
    renderRow={({ item, publishBusy, onTogglePublished, onDelete }) => (
      <AlbumRow
        key={item.id}
        album={item}
        coverUrl={imageThumbnailUrl(item.cover)}
        publishBusy={publishBusy}
        onTogglePublished={onTogglePublished}
        onDelete={onDelete}
      />
    )}
  />
);

export default AdminAlbumsList;
