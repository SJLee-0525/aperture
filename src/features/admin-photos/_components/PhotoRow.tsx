"use client";

import Image from "next/image";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { adminPhotoRoute } from "@/constants/routes";

import { imageThumbnailUrl } from "@/types/image";

import type { AdminPhotoListItem } from "@/types/admin";

import styles from "./PhotoRow.module.css";

type Props = {
  photo: AdminPhotoListItem;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 사진 행 — 드래그 핸들·썸네일·제목·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {AdminPhotoListItem} props.photo
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const PhotoRow = ({ photo, onTogglePublished, onDelete }: Props) => {
  const previewUrl = imageThumbnailUrl(photo.image);
  const onDeleteClick = () => {
    if (
      window.confirm(`"${photo.title.ko || "제목 없음"}" 사진을 삭제할까요? 되돌릴 수 없습니다.`)
    ) {
      onDelete(photo.id);
    }
  };

  return (
    <AdminSortableRow
      id={photo.id}
      published={photo.published}
      onTogglePublished={(next) => onTogglePublished(photo.id, next)}
      editHref={adminPhotoRoute(photo.id)}
      onDelete={onDeleteClick}
    >
      <span className={styles.thumb}>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={photo.title.ko || "사진"}
            fill
            sizes="72px"
            className={styles.thumbImg}
          />
        ) : null}
      </span>

      <span className={styles.title}>{photo.title.ko || "제목 없음"}</span>
    </AdminSortableRow>
  );
};

export { PhotoRow };
