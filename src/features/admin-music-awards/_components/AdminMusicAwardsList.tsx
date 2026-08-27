"use client";

import { AwardRow } from "@/features/admin-music-awards/_components/AwardRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { ROUTES } from "@/constants/routes";
import { getMusicAwardRepository } from "@/lib/admin/music-award-repository";

/**
 * 관리자 수상 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminMusicAwardsList = () => {
  const { items, status, error, reorder, togglePublished, publishPendingIds, remove } =
    useOrderedAdmin(getMusicAwardRepository());

  return (
    <AdminListShell
      title="수상"
      hint="드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다."
      newHref={ROUTES.ADMIN_MUSIC_AWARD_NEW}
      newLabel="+ 새 수상"
      emptyLabel="아직 수상이 없습니다."
      emptyCtaLabel="+ 첫 수상 만들기"
      status={status}
      error={error}
      errorFallback="수상을 불러오지 못했습니다."
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) => (
          <AwardRow
            key={item.id}
            award={item}
            publishBusy={publishPendingIds.has(item.id)}
            onTogglePublished={togglePublished}
            onDelete={remove}
          />
        ))}
      </AdminSortableList>
    </AdminListShell>
  );
};

export default AdminMusicAwardsList;
