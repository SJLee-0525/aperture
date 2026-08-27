"use client";

import { WorkRow } from "@/features/admin-music-works/_components/WorkRow";
import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { ROUTES } from "@/constants/routes";
import { getMusicWorkRepository } from "@/lib/admin/music-work-repository";

/**
 * 관리자 연주 목록 — 드래그·키보드 정렬, 공개 토글, 수정/삭제. 조립만 한다.
 *
 * @returns {JSX.Element}
 */
const AdminMusicWorksList = () => {
  const { items, status, error, reorder, togglePublished, remove } =
    useOrderedAdmin(getMusicWorkRepository());

  return (
    <AdminListShell
      title="연주"
      hint="드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다."
      newHref={ROUTES.ADMIN_MUSIC_WORK_NEW}
      newLabel="+ 새 연주"
      emptyLabel="아직 연주가 없습니다."
      emptyCtaLabel="+ 첫 연주 만들기"
      status={status}
      error={error}
      errorFallback="연주를 불러오지 못했습니다."
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) => (
          <WorkRow
            key={item.id}
            work={item}
            onTogglePublished={togglePublished}
            onDelete={remove}
          />
        ))}
      </AdminSortableList>
    </AdminListShell>
  );
};

export default AdminMusicWorksList;
