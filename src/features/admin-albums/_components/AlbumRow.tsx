"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";

import { adminAlbumRoute } from "@/constants/routes";
import type { AdminAlbumListItem } from "@/types/admin";

import styles from "./AlbumRow.module.css";

type Props = {
  album: AdminAlbumListItem;
  /** coverPhotoId → 이미지 URL (없으면 빈 썸네일). */
  coverUrl: string;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 앨범 행 — 드래그 핸들·커버 썸네일·제목·사진 수·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {AdminAlbumListItem} props.album
 * @param {string} props.coverUrl - coverPhotoId → 이미지 URL (없으면 빈 썸네일).
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const AlbumRow = ({ album, coverUrl, onTogglePublished, onDelete }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: album.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDeleteClick = () => {
    if (
      window.confirm(
        `"${album.title.ko || "제목 없음"}" 앨범을 삭제할까요? 사진은 지워지지 않습니다.`,
      )
    ) {
      onDelete(album.id);
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
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={album.title.ko || "앨범"}
            fill
            sizes="72px"
            className={styles.thumbImg}
          />
        ) : null}
      </span>

      <span className={styles.title}>{album.title.ko || "제목 없음"}</span>

      <span className={styles.count}>{album.photoIds.length}장</span>

      <button
        type="button"
        className={`${styles.badge} ${album.published ? styles.badgeOn : ""}`}
        onClick={() => onTogglePublished(album.id, !album.published)}
      >
        {album.published ? "공개" : "비공개"}
      </button>

      <span className={styles.actions}>
        <Link href={adminAlbumRoute(album.id)} className={styles.edit}>
          수정
        </Link>
        <button type="button" className={styles.delete} onClick={onDeleteClick}>
          삭제
        </button>
      </span>
    </li>
  );
};

export { AlbumRow };
