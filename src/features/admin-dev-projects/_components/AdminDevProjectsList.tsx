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
import { ProjectRow } from "@/features/admin-dev-projects/_components/ProjectRow";
import { useDevProjectsAdmin } from "@/features/admin-dev-projects/_hooks/use-dev-projects-admin";

import styles from "./AdminDevProjectsList.module.css";

/**
 * 관리자 프로젝트 목록 — 드래그 정렬·공개 토글·수정/삭제. 조립만, 로직은 useDevProjectsAdmin.
 *
 * @returns {JSX.Element}
 */
const AdminDevProjectsPage = () => {
  const { projects, status, error, reorder, togglePublished, remove } = useDevProjectsAdmin();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) reorder(String(active.id), String(over.id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>프로젝트</h1>
          <p className={styles.hint}>
            드래그로 순서를 조정합니다. 공개 배지를 눌러 표시 여부를 바꿉니다.
          </p>
        </div>
        <Link href={`${ROUTES.ADMIN_DEV_PROJECTS}/new`} className={styles.newBtn}>
          + 새 프로젝트
        </Link>
      </header>

      {status === "loading" ? <p className={styles.state}>불러오는 중…</p> : null}

      {status === "error" ? (
        <p className={styles.stateError} role="alert">
          {error ?? "프로젝트를 불러오지 못했습니다."}
        </p>
      ) : null}

      {status === "ready" && projects.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 프로젝트가 없습니다.</p>
          <Link href={`${ROUTES.ADMIN_DEV_PROJECTS}/new`} className={styles.newBtn}>
            + 첫 프로젝트 만들기
          </Link>
        </div>
      ) : null}

      {status === "ready" && projects.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className={styles.list}>
              {projects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
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

export default AdminDevProjectsPage;
