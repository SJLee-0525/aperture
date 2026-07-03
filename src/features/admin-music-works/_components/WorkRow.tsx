"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";

import { adminMusicWorkRoute } from "@/constants/routes";
import type { MusicWork } from "@/types/music";

import styles from "./WorkRow.module.css";

type Props = {
  work: MusicWork;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/** 공연일자를 YYYY.MM.DD 로 표기. */
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
};

/** 정렬 가능한 연주 행 — 드래그 핸들·포스터 썸네일·제목·날짜·공개 토글·수정/삭제. */
const WorkRow = ({ work, onTogglePublished, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: work.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (window.confirm(`"${work.title.ko || "제목 없음"}" 연주를 삭제할까요?`)) {
      onDelete(work.id);
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

      <span className={styles.thumb}>
        {work.poster.url ? (
          <Image
            src={work.poster.url}
            alt={work.title.ko || "연주"}
            fill
            sizes="48px"
            className={styles.thumbImg}
          />
        ) : null}
      </span>

      <span className={styles.title}>{work.title.ko || "제목 없음"}</span>

      <span className={styles.date}>{formatDate(work.performedAt)}</span>

      <button
        type="button"
        className={`${styles.badge} ${work.published ? styles.badgeOn : ""}`}
        onClick={() => onTogglePublished(work.id, !work.published)}
      >
        {work.published ? "공개" : "비공개"}
      </button>

      <span className={styles.actions}>
        <Link href={adminMusicWorkRoute(work.id)} className={styles.edit}>
          수정
        </Link>
        <button type="button" className={styles.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { WorkRow };
