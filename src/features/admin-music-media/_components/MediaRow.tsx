"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

import row from "@/features/admin-shell/_components/admin-row.module.css";

import { adminMusicMediaRoute } from "@/constants/routes";

import type { MusicMedia } from "@/types/music";

import styles from "./MediaRow.module.css";

type Props = {
  media: MusicMedia;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 영상 행 — 드래그 핸들·제목·YouTube ID·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {MusicMedia} props.media
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const MediaRow = ({ media, onTogglePublished, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: media.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (window.confirm(`"${media.title.ko || "제목 없음"}" 영상을 삭제할까요?`)) {
      onDelete(media.id);
    }
  };

  return (
    <li ref={setNodeRef} style={style} className={row.row}>
      <button
        type="button"
        className={row.handle}
        aria-label="순서 이동"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <span className={styles.title}>{media.title.ko || "제목 없음"}</span>

      <span className={styles.ytId}>{media.youtubeId || "—"}</span>

      <button
        type="button"
        className={`${row.badge} ${media.published ? row.badgeOn : ""}`}
        onClick={() => onTogglePublished(media.id, !media.published)}
      >
        {media.published ? "공개" : "비공개"}
      </button>

      <span className={row.actions}>
        <Link href={adminMusicMediaRoute(media.id)} className={row.edit}>
          수정
        </Link>
        <button type="button" className={row.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { MediaRow };
