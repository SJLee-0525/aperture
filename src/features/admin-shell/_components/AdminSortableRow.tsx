"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AdminRow } from "@/features/admin-shell/_components/AdminRow";

import type { ComponentProps } from "react";

import styles from "./admin-row.module.css";

type Props = { id: string } & Omit<
  ComponentProps<typeof AdminRow>,
  "handle" | "innerRef" | "style"
>;

/**
 * 드래그·키보드로 순서를 바꿀 수 있는 행.
 *
 * `AdminSortableList` 안에서만 쓴다. 정렬이 없는 목록은 `AdminRow` 를 직접 쓴다.
 * `useSortable` 은 SortableContext 를 전제하므로 조건부로 부를 수 없다.
 */
const AdminSortableRow = ({ id, ...rest }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <AdminRow
      {...rest}
      innerRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      handle={
        <button
          type="button"
          className={styles.handle}
          aria-label="순서 이동"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
      }
    />
  );
};

export { AdminSortableRow };
