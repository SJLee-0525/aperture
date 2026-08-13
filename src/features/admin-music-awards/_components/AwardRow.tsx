"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: award.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (window.confirm(`"${award.name.ko || "이름 없음"}" 수상을 삭제할까요?`)) {
      onDelete(award.id);
    }
  };

  return (
    <li ref={setNodeRef} style={style} className={styles.row}>
      <button
        type="button"
        className={styles.handle}
        aria-label="순서 이동"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <span className={styles.year}>{award.year || "—"}</span>

      <span className={styles.name}>{award.name.ko || "이름 없음"}</span>

      <span className={styles.place}>{award.place}</span>

      <button
        type="button"
        className={`${styles.badge} ${award.published ? styles.badgeOn : ""}`}
        onClick={() => onTogglePublished(award.id, !award.published)}
      >
        {award.published ? "공개" : "비공개"}
      </button>

      <span className={styles.actions}>
        <Link href={adminMusicAwardRoute(award.id)} className={styles.edit}>
          수정
        </Link>
        <button type="button" className={styles.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { AwardRow };
