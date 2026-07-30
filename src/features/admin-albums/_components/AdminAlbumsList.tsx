"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { AlbumRow } from "@/features/admin-albums/_components/AlbumRow";
import { useAlbumsAdmin } from "@/features/admin-albums/_hooks/use-albums-admin";
import { imagePreviewUrl } from "@/types/image";

import styles from "./AdminAlbumsList.module.css";

/** 관리자 앨범 목록 — 드래그 정렬·공개 토글·수정/삭제. 조립만, 로직은 useAlbumsAdmin. */
const AdminAlbumsPage = () => {
  const { albums, status, error, reorder, togglePublished, remove } = useAlbumsAdmin();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) reorder(String(active.id), String(over.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>앨범</h1>
          <p className={styles.hint}>
            드래그로 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다.
          </p>
        </div>
        <Link href={ROUTES.ADMIN_ALBUM_NEW} className={styles.newBtn}>
          + 새 앨범
        </Link>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "앨범을 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" && albums.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 앨범이 없습니다.</p>
          <Link href={ROUTES.ADMIN_ALBUM_NEW} className={styles.newBtn}>
            + 첫 앨범 만들기
          </Link>
        </div>
      ) : null}

      {status === "ready" && albums.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={albums.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.list}>
              {albums.map((album) => (
                <AlbumRow
                  key={album.id}
                  album={album}
                  coverUrl={imagePreviewUrl(album.cover)}
                  onTogglePublished={togglePublished}
                  onDelete={remove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  );
};

export default AdminAlbumsPage;
