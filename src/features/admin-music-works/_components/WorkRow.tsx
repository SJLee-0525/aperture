"use client";

import Image from "next/image";

import row from "@/features/admin-shell/_components/admin-row.module.css";
import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { ADMIN_UNTITLED } from "@/constants/admin-labels";
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
 * @param props.publishBusy 이 행의 공개 토글이 저장 중이다.
 */
const WorkRow = ({ work, publishBusy, onTogglePublished, onDelete }: Props) => {
  const previewUrl = imageThumbnailUrl(work.poster);
  return (
    <AdminSortableRow
      id={work.id}
      publishedBusy={publishBusy}
      published={work.published}
      onTogglePublished={(next) => onTogglePublished(work.id, next)}
      editHref={adminMusicWorkRoute(work.id)}
      onDelete={() => onDelete(work.id)}
      confirmDelete={{ name: work.title.ko || ADMIN_UNTITLED, noun: "연주" }}
    >
      <span className={`${row.thumb} ${styles.thumb}`}>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={work.title.ko || "연주"}
            fill
            sizes="48px"
            className={row.thumbImg}
          />
        ) : null}
      </span>

      <span className={row.title}>{work.title.ko || ADMIN_UNTITLED}</span>

      <span className={row.meta}>{formatEventYMD(work.performedAt)}</span>
    </AdminSortableRow>
  );
};

export { WorkRow };
