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
import { WorkRow } from "@/features/admin-music-works/_components/WorkRow";
import { useMusicWorksAdmin } from "@/features/admin-music-works/_hooks/use-music-works-admin";

import styles from "./AdminMusicWorksList.module.css";

/** 관리자 연주 목록 — 드래그 정렬·공개 토글·수정/삭제. 조립만, 로직은 useMusicWorksAdmin. */
const AdminMusicWorksPage = () => {
  const { works, status, error, reorder, togglePublished, remove } = useMusicWorksAdmin();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) reorder(String(active.id), String(over.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>연주</h1>
          <p className={styles.hint}>
            드래그로 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다.
          </p>
        </div>
        <Link href={`${ROUTES.ADMIN_MUSIC_WORKS}/new`} className={styles.newBtn}>
          + 새 연주
        </Link>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "연주를 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" && works.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 연주가 없습니다.</p>
          <Link href={`${ROUTES.ADMIN_MUSIC_WORKS}/new`} className={styles.newBtn}>
            + 첫 연주 만들기
          </Link>
        </div>
      ) : null}

      {status === "ready" && works.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={works.map((w) => w.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.list}>
              {works.map((work) => (
                <WorkRow
                  key={work.id}
                  work={work}
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

export default AdminMusicWorksPage;
