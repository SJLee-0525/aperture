"use client";

import Image from "next/image";

import row from "@/features/admin-shell/_components/admin-row.module.css";
import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { ADMIN_UNTITLED } from "@/constants/admin-labels";
import { adminAlbumRoute } from "@/constants/routes";

import type { AdminAlbumListItem } from "@/types/admin";


import styles from "./AlbumRow.module.css";

type Props = {
  album: AdminAlbumListItem;
  /** coverPhotoId → 이미지 URL (없으면 빈 썸네일). */
  coverUrl: string;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 앨범 행 — 드래그 핸들·커버 썸네일·제목·사진 수·공개 토글·수정/삭제.
 *
 * @param props.coverUrl - coverPhotoId → 이미지 URL (없으면 빈 썸네일).
 * @param props.publishBusy 이 행의 공개 토글이 저장 중이다.
 */
const AlbumRow = ({ album, coverUrl, publishBusy, onTogglePublished, onDelete }: Props) => {
  return (
    <AdminSortableRow
      id={album.id}
      publishedBusy={publishBusy}
      published={album.published}
      onTogglePublished={(next) => onTogglePublished(album.id, next)}
      editHref={adminAlbumRoute(album.id)}
      onDelete={() => onDelete(album.id)}
      confirmDelete={{ name: album.title.ko || ADMIN_UNTITLED, noun: "앨범", note: "사진은 지워지지 않습니다." }}
    >
      <span className={`${row.thumb} ${styles.thumb}`}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={album.title.ko || "앨범"}
            fill
            sizes="72px"
            className={row.thumbImg}
          />
        ) : null}
      </span>

      <span className={row.title}>{album.title.ko || ADMIN_UNTITLED}</span>

      <span className={row.meta}>{album.photoIds.length}장</span>
    </AdminSortableRow>
  );
};

export { AlbumRow };
