"use client";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { adminMusicMediaRoute } from "@/constants/routes";

import type { MusicMedia } from "@/types/music";

import styles from "./MediaRow.module.css";

type Props = {
  media: MusicMedia;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 영상 행 — 드래그 핸들·제목·YouTube ID·공개 토글·수정/삭제.
 *
 * @param {Props} props
 * @param {MusicMedia} props.media
 * @param {boolean} props.publishBusy 이 행의 공개 토글이 저장 중이다.
 * @param {(id: string, next: boolean) => void} props.onTogglePublished
 * @param {(id: string) => void} props.onDelete
 * @returns {JSX.Element}
 */
const MediaRow = ({ media, publishBusy, onTogglePublished, onDelete }: Props) => {
  const onDeleteClick = () => {
    if (window.confirm(`"${media.title.ko || "제목 없음"}" 영상을 삭제할까요?`)) {
      onDelete(media.id);
    }
  };

  return (
    <AdminSortableRow
      id={media.id}
      publishedBusy={publishBusy}
      published={media.published}
      onTogglePublished={(next) => onTogglePublished(media.id, next)}
      editHref={adminMusicMediaRoute(media.id)}
      onDelete={onDeleteClick}
    >
      <span className={styles.title}>{media.title.ko || "제목 없음"}</span>

      <span className={styles.ytId}>{media.youtubeId || "—"}</span>
    </AdminSortableRow>
  );
};

export { MediaRow };
