"use client";

import Image from "next/image";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { ADMIN_UNTITLED } from "@/constants/admin-labels";
import { adminDevProjectRoute } from "@/constants/routes";

import { imageThumbnailUrl } from "@/types/image";

import type { AdminDevProjectListItem } from "@/types/admin";

import styles from "./ProjectRow.module.css";

type Props = {
  project: AdminDevProjectListItem;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 프로젝트 행 — 드래그 핸들·대표 썸네일·제목·연도·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {AdminDevProjectListItem} props.project
 * @param {boolean} props.publishBusy 이 행의 공개 토글이 저장 중이다.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const ProjectRow = ({ project, publishBusy, onTogglePublished, onDelete }: Props) => {
  const previewUrl = imageThumbnailUrl(project.cover);
  return (
    <AdminSortableRow
      id={project.id}
      publishedBusy={publishBusy}
      published={project.published}
      onTogglePublished={(next) => onTogglePublished(project.id, next)}
      editHref={adminDevProjectRoute(project.id)}
      onDelete={() => onDelete(project.id)}
      confirmDelete={{ name: project.title.ko || ADMIN_UNTITLED, noun: "프로젝트" }}
    >
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
    </AdminSortableRow>
  );
};

export { ProjectRow };
