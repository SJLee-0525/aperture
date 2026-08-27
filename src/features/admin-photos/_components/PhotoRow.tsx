"use client";

import Image from "next/image";

import row from "@/features/admin-shell/_components/admin-row.module.css";
import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { ADMIN_UNTITLED } from "@/constants/admin-labels";
import { adminPhotoRoute } from "@/constants/routes";

import { imageThumbnailUrl } from "@/types/image";

import type { AdminPhotoListItem } from "@/types/admin";


import styles from "./PhotoRow.module.css";

type Props = {
  photo: AdminPhotoListItem;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 사진 행 — 드래그 핸들·썸네일·제목·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {AdminPhotoListItem} props.photo
 * @param {boolean} props.publishBusy 이 행의 공개 토글이 저장 중이다.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const PhotoRow = ({ photo, publishBusy, onTogglePublished, onDelete }: Props) => {
  const previewUrl = imageThumbnailUrl(photo.image);
  return (
    <AdminSortableRow
      id={photo.id}
      publishedBusy={publishBusy}
      published={photo.published}
      onTogglePublished={(next) => onTogglePublished(photo.id, next)}
      editHref={adminPhotoRoute(photo.id)}
      onDelete={() => onDelete(photo.id)}
      confirmDelete={{ name: photo.title.ko || ADMIN_UNTITLED, noun: "사진", note: "되돌릴 수 없습니다." }}
    >
      <span className={`${row.thumb} ${styles.thumb}`}>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={photo.title.ko || "사진"}
            fill
            sizes="72px"
            className={row.thumbImg}
          />
        ) : null}
      </span>

      <span className={row.title}>{photo.title.ko || ADMIN_UNTITLED}</span>
    </AdminSortableRow>
  );
};

export { PhotoRow };
