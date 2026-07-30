"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";

import type { AdminPhotoListItem } from "@/types/admin";
import { imagePreviewUrl } from "@/types/image";

import styles from "./SelectedPhotoChip.module.css";

type Props = {
  photo: AdminPhotoListItem;
  isCover: boolean;
  onSetCover: (id: string) => void;
  onRemove: (id: string) => void;
};

/** 선택된 사진 한 장 — 드래그로 순서 이동, 커버 지정, 제외. 순서 = photoIds 배열 순서. */
const SelectedPhotoChip = ({ photo, isCover, onSetCover, onRemove }: Props) => {
  const previewUrl = imagePreviewUrl(photo.image);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className={`${styles.chip} ${isCover ? styles.cover : ""}`}>
      <button
        type="button"
        className={styles.grab}
        aria-label={`${photo.title.ko || "사진"} 순서 이동`}
        {...attributes}
        {...listeners}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={photo.title.ko || "사진"}
            fill
            sizes="96px"
            className={styles.img}
          />
        ) : null}
        {isCover ? <span className={styles.coverTag}>커버</span> : null}
      </button>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.coverBtn}
          onClick={() => onSetCover(photo.id)}
          disabled={isCover}
        >
          {isCover ? "커버" : "커버로"}
        </button>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={() => onRemove(photo.id)}
          aria-label="앨범에서 제외"
        >
          제외
        </button>
      </div>
    </li>
  );
};

export { SelectedPhotoChip };
