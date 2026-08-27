"use client";

import { AlbumRow } from "@/features/admin-albums/_components/AlbumRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";


import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { ROUTES } from "@/constants/routes";
import { getAlbumRepository } from "@/lib/admin/album-repository";

import { imageThumbnailUrl } from "@/types/image";

/**
 * 관리자 앨범 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminAlbumsList = () => {
  const { items, status, error, reorder, togglePublished, remove } = useOrderedAdmin(
    getAlbumRepository(),
  );

  return (
    <AdminListShell
      title="앨범"
      hint="드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다."
      newHref={ROUTES.ADMIN_ALBUM_NEW}
      newLabel="+ 새 앨범"
      emptyLabel="아직 앨범이 없습니다."
      emptyCtaLabel="+ 첫 앨범 만들기"
      status={status}
      error={error}
      errorFallback="앨범을 불러오지 못했습니다."
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) => (
          <AlbumRow
            key={item.id}
            album={item}
              coverUrl={imageThumbnailUrl(item.cover)}
            onTogglePublished={togglePublished}
            onDelete={remove}
          />
        ))}
      </AdminSortableList>
    </AdminListShell>
  );
};

export default AdminAlbumsList;
