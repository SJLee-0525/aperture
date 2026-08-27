"use client";

import Image from "next/image";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { adminMusicWorkRoute } from "@/constants/routes";
import { formatEventYMD } from "@/lib/format/format-date";

import { imageThumbnailUrl } from "@/types/image";

import type { AdminMusicWorkListItem } from "@/types/admin";

import styles from "./WorkRow.module.css";

type Props = {
  work: AdminMusicWorkListItem;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 연주 행 — 드래그 핸들·포스터 썸네일·제목·날짜·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {AdminMusicWorkListItem} props.work
 * @param {boolean} props.publishBusy 이 행의 공개 토글이 저장 중이다.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const WorkRow = ({ work, publishBusy, onTogglePublished, onDelete }: Props) => {
  const previewUrl = imageThumbnailUrl(work.poster);
  const onDeleteClick = () => {
    if (window.confirm(`"${work.title.ko || "제목 없음"}" 연주를 삭제할까요?`)) {
      onDelete(work.id);
    }
  };

  return (
    <AdminSortableRow
      id={work.id}
      publishedBusy={publishBusy}
      published={work.published}
      onTogglePublished={(next) => onTogglePublished(work.id, next)}
      editHref={adminMusicWorkRoute(work.id)}
      onDelete={onDeleteClick}
    >
      <span className={styles.thumb}>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={work.title.ko || "연주"}
            fill
            sizes="48px"
            className={styles.thumbImg}
          />
        ) : null}
      </span>

      <span className={styles.title}>{work.title.ko || "제목 없음"}</span>

      <span className={styles.date}>{formatEventYMD(work.performedAt)}</span>
    </AdminSortableRow>
  );
};

export { WorkRow };
