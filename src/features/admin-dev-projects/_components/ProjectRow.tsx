"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";

import { adminDevProjectRoute } from "@/constants/routes";
import type { AdminDevProjectListItem } from "@/types/admin";
import { imagePreviewUrl } from "@/types/image";

import styles from "./ProjectRow.module.css";

type Props = {
  project: AdminDevProjectListItem;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/** 정렬 가능한 프로젝트 행 — 드래그 핸들·대표 썸네일·제목·연도·공개 토글·수정/삭제. */
const ProjectRow = ({ project, onTogglePublished, onDelete }: Props) => {
  const previewUrl = imagePreviewUrl(project.cover);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (window.confirm(`"${project.title.ko || "제목 없음"}" 프로젝트를 삭제할까요?`)) {
      onDelete(project.id);
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
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={project.title.ko || "프로젝트"}
            fill
            sizes="64px"
            className={styles.thumbImg}
          />
        ) : null}
      </span>

      <span className={styles.title}>{project.title.ko || "제목 없음"}</span>

      <span className={styles.year}>{project.year || "—"}</span>

      <button
        type="button"
        className={`${styles.badge} ${project.published ? styles.badgeOn : ""}`}
        onClick={() => onTogglePublished(project.id, !project.published)}
      >
        {project.published ? "공개" : "비공개"}
      </button>

      <span className={styles.actions}>
        <Link href={adminDevProjectRoute(project.id)} className={styles.edit}>
          수정
        </Link>
        <button type="button" className={styles.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { ProjectRow };
