"use client";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { adminMusicAwardRoute } from "@/constants/routes";

import type { MusicAward } from "@/types/music";

import styles from "./AwardRow.module.css";

type Props = {
  award: MusicAward;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 수상 행 — 드래그 핸들·연도·수상명·장소·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {MusicAward} props.award
 * @param {boolean} props.publishBusy 이 행의 공개 토글이 저장 중이다.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const AwardRow = ({ award, publishBusy, onTogglePublished, onDelete }: Props) => {
  const onDeleteClick = () => {
    if (window.confirm(`"${award.name.ko || "이름 없음"}" 수상을 삭제할까요?`)) {
      onDelete(award.id);
    }
  };

  return (
    <AdminSortableRow
      id={award.id}
      publishedBusy={publishBusy}
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
