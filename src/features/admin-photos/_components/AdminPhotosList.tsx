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

import { AdminButton } from "@/components/AdminButton";
import { PhotoRow } from "@/features/admin-photos/_components/PhotoRow";
import styles from "@/features/admin-shell/_components/admin-list.module.css";

import { usePhotosAdmin } from "@/features/admin-photos/_hooks/use-photos-admin";

import { ROUTES } from "@/constants/routes";


/**
 * 관리자 사진 목록 — 드래그 정렬·공개 토글·수정/삭제. 조립만, 로직은 usePhotosAdmin.
 *
 * @returns {JSX.Element}
 */
const AdminPhotosPage = () => {
  const { photos, status, error, reorder, togglePublished, remove } = usePhotosAdmin();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) reorder(String(active.id), String(over.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>사진</h1>
          <p className={styles.hint}>
            드래그로 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다.
          </p>
        </div>
        <AdminButton
          variant="primary"
          size="sm"
          href={ROUTES.ADMIN_PHOTO_NEW}
          className={styles.newBtn}
        >
          + 새 사진
        </AdminButton>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "사진을 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" && photos.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 사진이 없습니다.</p>
          <AdminButton
            variant="primary"
            size="sm"
            href={ROUTES.ADMIN_PHOTO_NEW}
            className={styles.newBtn}
          >
            + 첫 사진 추가
          </AdminButton>
        </div>
      ) : null}

      {status === "ready" && photos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.list}>
              {photos.map((photo) => (
                <PhotoRow
                  key={photo.id}
                  photo={photo}
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

export default AdminPhotosPage;
