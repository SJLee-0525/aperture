"use client";

import { PhotoRow } from "@/features/admin-photos/_components/PhotoRow";
import { AdminSortableListPage } from "@/features/admin-shell/_components/AdminSortableListPage";

import { adminNewRoute, ROUTES } from "@/constants/routes";
import { getPhotoRepository } from "@/lib/admin/photo-repository";

/**
 * 관리자 사진 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminPhotosList = () => (
  <AdminSortableListPage
    noun="사진"
    newHref={adminNewRoute(ROUTES.ADMIN_PHOTOS)}
    getRepository={getPhotoRepository}
    renderRow={({ item, publishBusy, onTogglePublished, onDelete }) => (
      <PhotoRow
        key={item.id}
        photo={item}
        publishBusy={publishBusy}
        onTogglePublished={onTogglePublished}
        onDelete={onDelete}
      />
    )}
  />
);

export default AdminPhotosList;
