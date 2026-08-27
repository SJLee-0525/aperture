"use client";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { adminMusicAwardRoute } from "@/constants/routes";

import type { MusicAward } from "@/types/music";

import styles from "./AwardRow.module.css";

type Props = {
  award: MusicAward;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 수상 행 — 드래그 핸들·연도·수상명·장소·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {MusicAward} props.award
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const AwardRow = ({ award, onTogglePublished, onDelete }: Props) => {
  const onDeleteClick = () => {
    if (window.confirm(`"${award.name.ko || "이름 없음"}" 수상을 삭제할까요?`)) {
      onDelete(award.id);
    }
  };

  return (
    <AdminSortableRow
      id={award.id}
      published={award.published}
      onTogglePublished={(next) => onTogglePublished(award.id, next)}
      editHref={adminMusicAwardRoute(award.id)}
      onDelete={onDeleteClick}
    >
      <span className={styles.year}>{award.year || "—"}</span>

      <span className={styles.name}>{award.name.ko || "이름 없음"}</span>

      <span className={styles.place}>{award.place}</span>
    </AdminSortableRow>
  );
};

export { AwardRow };
