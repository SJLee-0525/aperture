"use client";

import { MediaRow } from "@/features/admin-music-media/_components/MediaRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { ROUTES } from "@/constants/routes";
import { getMusicMediaRepository } from "@/lib/admin/music-media-repository";

/**
 * 관리자 영상 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminMusicMediaList = () => {
  const { items, status, error, reorder, togglePublished, publishPendingIds, remove } =
    useOrderedAdmin(getMusicMediaRepository());

  return (
    <AdminListShell
      title="영상"
      hint="드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다."
      newHref={ROUTES.ADMIN_MUSIC_MEDIA_NEW}
      newLabel="+ 새 영상"
      emptyLabel="아직 영상이 없습니다."
      emptyCtaLabel="+ 첫 영상 만들기"
      status={status}
      error={error}
      errorFallback="영상을 불러오지 못했습니다."
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) => (
          <MediaRow
            key={item.id}
            media={item}
            publishBusy={publishPendingIds.has(item.id)}
            onTogglePublished={togglePublished}
            onDelete={remove}
          />
        ))}
      </AdminSortableList>
    </AdminListShell>
  );
};

export default AdminMusicMediaList;
