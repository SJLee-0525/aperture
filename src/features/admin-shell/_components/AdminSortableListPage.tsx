"use client";

import { AdminListShell } from "@/features/admin-shell/_components/AdminListShell";
import { AdminSortableList } from "@/features/admin-shell/_components/AdminSortableList";

import { useOrderedAdmin } from "@/hooks/use-ordered-admin";

import { objectParticle, subjectParticle } from "@/lib/i18n/korean-particle";

import type { ReactNode } from "react";

/** 여섯 목록이 같은 조작을 갖는다. 문구가 갈리면 같은 화면이 다르게 읽힌다. */
const SORT_HINT =
  "드래그하거나 핸들에서 스페이스바를 눌러 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다.";

type Row = { id: string; published: boolean; order: number };

type RowProps<T> = {
  item: T;
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

type Props<T extends Row> = {
  /** "수상" 처럼 화면이 다루는 대상. 제목과 네 문구가 이것으로 만들어진다. */
  noun: string;
  newHref: string;
  getRepository: () => Parameters<typeof useOrderedAdmin<T>>[0];
  renderRow: (props: RowProps<T>) => ReactNode;
};

/**
 * 수동 정렬을 갖는 관리자 목록 화면.
 *
 * `AdminListShell` 은 4분기 렌더만 소유하고 "이 화면이 무엇인가" 는 호출부에 남아 있었다.
 * 여섯이 리터럴 열 개씩을 넘겼고 그중 여섯이 한국어 문구였다. 대상 이름 하나에서
 * 파생할 수 있는 것을 파생시킨다 — 조사는 받침이 정한다.
 *
 * 블로그 목록은 이 층을 쓰지 않는다. 정렬이 없고 제목·빈 문구가 대상 이름에서
 * 파생되지 않는다("블로그", "아직 쓴 글이 없습니다").
 */
const AdminSortableListPage = <T extends Row>({
  noun,
  newHref,
  getRepository,
  renderRow,
}: Props<T>) => {
  const { items, status, error, reorder, togglePublished, publishPendingIds, remove } =
    useOrderedAdmin<T>(getRepository());

  return (
    <AdminListShell
      title={noun}
      hint={SORT_HINT}
      newHref={newHref}
      newLabel={`+ 새 ${noun}`}
      emptyLabel={`아직 ${noun}${subjectParticle(noun)} 없습니다.`}
      emptyCtaLabel={`+ 첫 ${noun} 만들기`}
      status={status}
      error={error}
      errorFallback={`${noun}${objectParticle(noun)} 불러오지 못했습니다.`}
      isEmpty={items.length === 0}
    >
      <AdminSortableList ids={items.map((item) => item.id)} onReorder={reorder}>
        {items.map((item) =>
          renderRow({
            item,
            publishBusy: publishPendingIds.has(item.id),
            onTogglePublished: togglePublished,
            onDelete: remove,
          }),
        )}
      </AdminSortableList>
    </AdminListShell>
  );
};

export { AdminSortableListPage };
