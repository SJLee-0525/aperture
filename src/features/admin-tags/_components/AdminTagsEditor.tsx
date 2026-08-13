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
import { TagAddForm } from "@/features/admin-tags/_components/TagAddForm";
import { TagRow } from "@/features/admin-tags/_components/TagRow";

import { useTagsAdmin } from "@/features/admin-tags/_hooks/use-tags-admin";

import { ROUTES } from "@/constants/routes";

import styles from "./AdminTagsEditor.module.css";

/**
 * 관리자 태그 사전 — 추가·편집·삭제·드래그 정렬. 조립만, 로직은 useTagsAdmin.
 *
 * @returns {JSX.Element}
 */
const AdminTagsPage = () => {
  const { tags, status, error, saving, saved, editLabel, addTag, removeTag, reorder, save } =
    useTagsAdmin();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) reorder(String(active.id), String(over.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>태그 사전</h1>
        <p className={styles.hint}>
          필터 칩의 ko/en 을 정의합니다. 드래그 순서 = 공개 필터 칩 표시 순서. id 는 사진이 참조하는
          키라 수정할 수 없습니다.
        </p>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "태그를 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" ? (
        <>
          <TagAddForm onAdd={addTag} />

          {tags.length === 0 ? (
            <div className={styles.empty}>
              <p>아직 태그가 없습니다. 위에서 첫 태그를 추가하세요.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <ul className={styles.list}>
                  {tags.map((tag) => (
                    <TagRow key={tag.id} tag={tag} onEditLabel={editLabel} onDelete={removeTag} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {error ? (
            <p className={styles.stateError} role="alert">
              {error}
            </p>
          ) : null}

          {saved ? <p className={styles.state}>저장되었습니다.</p> : null}

          <div className={styles.actions}>
            <AdminButton variant="primary" onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </AdminButton>
            <AdminButton variant="secondary" href={ROUTES.ADMIN} disabled={saving}>
              취소
            </AdminButton>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AdminTagsPage;
