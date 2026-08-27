"use client";

import { PhotoRow } from "@/features/admin-photos/_components/PhotoRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { ROUTES } from "@/constants/routes";
import { getPhotoRepository } from "@/lib/admin/photo-repository";

/**
 * 관리자 사진 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminPhotosList = () => {
  const { items, status, error, reorder, togglePublished, publishPendingIds, remove } =
    useOrderedAdmin(getPhotoRepository());

  return (
    <AdminListShell
      title="사진"
      hint="드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다."
      newHref={ROUTES.ADMIN_PHOTO_NEW}
      newLabel="+ 새 사진"
      emptyLabel="아직 사진이 없습니다."
      emptyCtaLabel="+ 첫 사진 추가"
      status={status}
      error={error}
      errorFallback="사진을 불러오지 못했습니다."
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) => (
          <PhotoRow
            key={item.id}
            photo={item}
            publishBusy={publishPendingIds.has(item.id)}
            onTogglePublished={togglePublished}
            onDelete={remove}
          />
        ))}
      </AdminSortableList>
    </AdminListShell>
  );
};

export default AdminPhotosList;
