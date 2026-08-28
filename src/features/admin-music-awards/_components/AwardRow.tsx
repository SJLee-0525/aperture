"use client";

import { AdminSortableRow } from "@/features/admin-shell/_components/AdminSortableRow";

import { ADMIN_UNNAMED } from "@/constants/admin-labels";
import { adminMusicAwardRoute } from "@/constants/routes";

import type { MusicAward } from "@/types/music";

import styles from "./AwardRow.module.css";

type Props = {
  award: MusicAward;
  /** 이 행의 공개 토글이 저장 중이다. 연타하면 화면과 서버 상태가 어긋난다. */
  publishBusy: boolean;
  onTogglePublished: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

/**
 * 정렬 가능한 수상 행 — 드래그 핸들·연도·수상명·장소·공개 토글·수정/삭제.
 *
 * @param props.publishBusy 이 행의 공개 토글이 저장 중이다.
 */
const AwardRow = ({ award, publishBusy, onTogglePublished, onDelete }: Props) => {
  return (
    <AdminSortableRow
      id={award.id}
      publishedBusy={publishBusy}
      published={award.published}
      onTogglePublished={(next) => onTogglePublished(award.id, next)}
      editHref={adminMusicAwardRoute(award.id)}
      onDelete={() => onDelete(award.id)}
      confirmDelete={{ name: award.name.ko || ADMIN_UNNAMED, noun: "수상" }}
    >
      <span className={styles.year}>{award.year || "—"}</span>

      <span className={styles.name}>{award.name.ko || ADMIN_UNNAMED}</span>

      <span className={styles.place}>{award.place}</span>
    </AdminSortableRow>
  );
};

export { AwardRow };
