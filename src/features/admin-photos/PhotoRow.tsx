"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";

import { adminPhotoRoute } from "@/constants/routes";
import type { Photo } from "@/types/photo";

import styles from "./PhotoRow.module.css";

type Props = {
  photo: Photo;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/** 정렬 가능한 사진 행 — 드래그 핸들·썸네일·제목·공개 토글·수정/삭제. */
const PhotoRow = ({ photo, onTogglePublished, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (
      window.confirm(`"${photo.title.ko || "제목 없음"}" 사진을 삭제할까요? 되돌릴 수 없습니다.`)
    ) {
      onDelete(photo.id);
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
        {photo.image?.url ? (
          <Image
            src={photo.image.url}
            alt={photo.title.ko || "사진"}
            fill
            sizes="72px"
            className={styles.thumbImg}
          />
        ) : null}
      </span>

      <span className={styles.title}>{photo.title.ko || "제목 없음"}</span>

      <button
        type="button"
        className={`${styles.badge} ${photo.published ? styles.badgeOn : ""}`}
        onClick={() => onTogglePublished(photo.id, !photo.published)}
      >
        {photo.published ? "공개" : "비공개"}
      </button>

      <span className={styles.actions}>
        <Link href={adminPhotoRoute(photo.id)} className={styles.edit}>
          수정
        </Link>
        <button type="button" className={styles.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { PhotoRow };
